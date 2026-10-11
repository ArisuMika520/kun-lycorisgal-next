import { z } from 'zod'
import { spiderHttp } from '~/app/api/spider/lib/api/_httpClient'
import {
  bestLanguageRanks,
  canonicalProductId,
  dlsiteWorkHref,
  isAffiliateShortUrl,
  normalizeDlsiteProductId,
  officialProductId,
  rankStoreProducts,
  type OfficialPurchase,
  type ReleaseLangRef,
  type StoreQuote
} from '~/lib/nextmoe/affiliateUrl'
import { getKv, setKv } from '~/lib/redis'
import { parseVndbWorkId } from '~/utils/vndbId'

const NEXTMOE_BASE = 'https://api.nextmoe.dev'
const HTTP_TIMEOUT_MS = 3000
const PAGE_BUDGET_MS = 9000
const REDIS_TIMEOUT_MS = 500
const PURCHASE_SUCCESS_TTL = 3600
const PURCHASE_MISS_TTL = 21600
const PURCHASE_ERROR_TTL = 60
const CANDIDATE_TTL = 86400
const CANDIDATE_EMPTY_TTL = 21600
const MAX_PURCHASE_CALLS = 2
const HALT_KEY = 'nextmoe:purchase:halt'

const campaignSchema = z
  .object({
    object: z.literal('campaign'),
    id: z.union([z.string(), z.number()]),
    name: z.string()
  })
  .passthrough()

const purchaseSchema = z
  .object({
    object: z.literal('purchase_links'),
    product_id: z.string(),
    purchase_url: z.string(),
    coupon_url: z.string().nullable(),
    campaign: campaignSchema.nullable()
  })
  .passthrough()

const cachedPurchaseSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      productId: z.string(),
      purchaseUrl: z.string(),
      couponUrl: z.string().nullable(),
      campaignName: z.string().nullable(),
      storeUrl: z.string().nullable().optional()
    })
    .passthrough(),
  z.object({ ok: z.literal(false) }).passthrough()
])

const listSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.union([z.string(), z.number()]),
            refs: z
              .array(
                z
                  .object({
                    source: z.string().nullish(),
                    external_id: z.string().nullish()
                  })
                  .passthrough()
              )
              .nullish()
          })
          .passthrough()
      )
      .nullish()
  })
  .passthrough()

const releaseListSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            lang: z.string().nullish(),
            refs: z
              .array(
                z
                  .object({
                    source: z.string().nullish(),
                    external_id: z.string().nullish()
                  })
                  .passthrough()
              )
              .nullish()
          })
          .passthrough()
      )
      .nullish(),
    next_cursor: z.string().nullish()
  })
  .passthrough()

const quoteSchema = z
  .object({
    source: z.string(),
    external_id: z.string(),
    region: z.string().nullish(),
    quote_state: z.string(),
    url: z.string().nullish(),
    discount_percent: z.number().nullish()
  })
  .passthrough()

const priceListSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            quotes: z.array(quoteSchema).nullish()
          })
          .passthrough()
      )
      .nullish()
  })
  .passthrough()

const problemSchema = z
  .object({
    code: z.string().optional()
  })
  .passthrough()

const candidateSchema = z.union([
  z.array(z.string()),
  z
    .object({
      ids: z.array(z.string()),
      workIds: z.array(z.string())
    })
    .passthrough()
])

const haltSchema = z
  .object({
    until: z.number(),
    reason: z.string()
  })
  .passthrough()

type PurchaseCache =
  | { state: 'miss' }
  | { state: 'negative' }
  | { state: 'ready'; purchase: OfficialPurchase }

type CandidateCache =
  | { state: 'miss' }
  | { state: 'ready'; ids: string[]; workIds: string[] }

type ApiResult = {
  status: number
  data: unknown
  retryAfter: number | null
}

export type PurchaseInput = {
  dlsiteId?: string | null
  vndbId?: string | null
  officialHrefs?: Array<string | null | undefined>
}

const inflight = new Map<string, Promise<unknown>>()
const warned = new Set<string>()
let memoryHaltUntil = 0

function readApiKey(): string | null {
  const key = process.env.NEXTMOE_API_KEY?.trim()
  if (!key || !key.startsWith('nmk_')) return null
  return key
}

function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer)
  })
}

async function readKv(key: string): Promise<string | null | undefined> {
  try {
    return await raceTimeout(getKv(key).catch(() => undefined), REDIS_TIMEOUT_MS)
  } catch {
    return undefined
  }
}

async function writeKv(key: string, value: string, ttl: number) {
  try {
    await raceTimeout(
      setKv(key, value, ttl).catch(() => undefined),
      REDIS_TIMEOUT_MS
    )
  } catch {
    return
  }
}

function singleFlight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing
  const promise = run().finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}

function warnOnce(reason: string) {
  if (warned.has(reason)) return
  warned.add(reason)
  console.warn(`NextMoe purchase links paused: ${reason}`)
}

async function halt(seconds: number, reason: string) {
  const safeSeconds = Math.max(1, Math.floor(seconds))
  const until = Date.now() + safeSeconds * 1000
  if (until > memoryHaltUntil) memoryHaltUntil = until
  warnOnce(reason)
  await writeKv(HALT_KEY, JSON.stringify({ until, reason }), safeSeconds)
}

async function halted(): Promise<boolean> {
  if (Date.now() < memoryHaltUntil) return true
  const raw = await readKv(HALT_KEY)
  if (!raw) return false
  try {
    const parsed = haltSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return false
    if (parsed.data.until <= Date.now()) return false
    memoryHaltUntil = parsed.data.until
    return true
  } catch {
    return false
  }
}

function retryAfterSeconds(headers: unknown): number | null {
  if (!headers || typeof headers !== 'object') return null
  const record = headers as Record<string, unknown> & {
    get?: (name: string) => unknown
  }
  const raw =
    typeof record.get === 'function'
      ? record.get('retry-after')
      : record['retry-after']
  const seconds = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

function problemCode(data: unknown): string | undefined {
  const parsed = problemSchema.safeParse(data)
  return parsed.success ? parsed.data.code : undefined
}

async function noteAuthFailure(
  status: number,
  data: unknown,
  retryAfter: number | null
): Promise<boolean> {
  const code = problemCode(data)
  if (
    status === 401 ||
    code === 'MISSING_CREDENTIAL' ||
    code === 'INVALID_CREDENTIAL'
  ) {
    await halt(15 * 60, code || '401')
    return true
  }
  if (status === 403) {
    await halt(6 * 3600, code || '403')
    return true
  }
  if (status === 429) {
    const seconds =
      code === 'QUOTA_EXCEEDED'
        ? Math.min(retryAfter ?? 3600, 86400)
        : Math.min(Math.max(retryAfter ?? 60, 1), 900)
    await halt(seconds, code || '429')
    return true
  }
  return false
}

function purchaseKey(productId: string) {
  return `nextmoe:purchase:${productId}`
}

function toPurchase(value: {
  productId: string
  purchaseUrl: string
  couponUrl: string | null
  campaignName: string | null
  storeUrl?: string | null
}): OfficialPurchase | null {
  const productId = canonicalProductId(value.productId)
  if (!productId || !isAffiliateShortUrl(value.purchaseUrl)) return null
  const couponUrl =
    value.couponUrl && isAffiliateShortUrl(value.couponUrl) ? value.couponUrl : null
  const campaignName = couponUrl ? value.campaignName?.trim() || null : null
  return {
    productId,
    purchaseUrl: value.purchaseUrl,
    couponUrl,
    campaignName,
    storeUrl: dlsiteWorkHref(productId, value.storeUrl)
  }
}

async function readPurchaseCache(productId: string): Promise<PurchaseCache> {
  const raw = await readKv(purchaseKey(productId))
  if (!raw) return { state: 'miss' }
  try {
    const parsed = cachedPurchaseSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return { state: 'miss' }
    if (!parsed.data.ok) return { state: 'negative' }
    const purchase = toPurchase(parsed.data)
    if (!purchase || purchase.productId !== productId) return { state: 'miss' }
    return { state: 'ready', purchase }
  } catch {
    return { state: 'miss' }
  }
}

function parsePurchase(productId: string, data: unknown): OfficialPurchase | null {
  const parsed = purchaseSchema.safeParse(data)
  if (!parsed.success) return null
  if (canonicalProductId(parsed.data.product_id) !== productId) return null
  const couponUrl =
    parsed.data.coupon_url && isAffiliateShortUrl(parsed.data.coupon_url)
      ? parsed.data.coupon_url
      : null
  if (!isAffiliateShortUrl(parsed.data.purchase_url)) {
    warnOnce('short-host')
    return null
  }
  return toPurchase({
    productId,
    purchaseUrl: parsed.data.purchase_url,
    couponUrl,
    campaignName: couponUrl ? parsed.data.campaign?.name ?? null : null
  })
}

async function nextmoeGet(
  path: string,
  params?: Record<string, string | boolean>,
  auth = true
): Promise<ApiResult> {
  const key = auth ? readApiKey() : null
  try {
    const response = await spiderHttp.get(`${NEXTMOE_BASE}${path}`, {
      params,
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      timeout: HTTP_TIMEOUT_MS,
      validateStatus: () => true
    })
    return {
      status: response.status,
      data: response.data,
      retryAfter: retryAfterSeconds(response.headers)
    }
  } catch {
    return { status: 0, data: null, retryAfter: null }
  }
}

async function fetchPurchase(productId: string): Promise<OfficialPurchase | null> {
  const cached = await readPurchaseCache(productId)
  if (cached.state === 'ready') return cached.purchase
  if (cached.state === 'negative') return null
  if (await halted()) return null

  const response = await nextmoeGet(
    `/v2/store/purchase-links/${encodeURIComponent(productId)}`
  )
  if (response.status === 200) {
    const purchase = parsePurchase(productId, response.data)
    if (purchase) {
      await writeKv(
        purchaseKey(productId),
        JSON.stringify({
          ok: true,
          productId: purchase.productId,
          purchaseUrl: purchase.purchaseUrl,
          couponUrl: purchase.couponUrl,
          campaignName: purchase.campaignName,
          storeUrl: purchase.storeUrl
        }),
        PURCHASE_SUCCESS_TTL
      )
      return purchase
    }
  }

  if (await noteAuthFailure(response.status, response.data, response.retryAfter)) {
    return null
  }
  await writeKv(
    purchaseKey(productId),
    JSON.stringify({ ok: false }),
    response.status === 404 ? PURCHASE_MISS_TTL : PURCHASE_ERROR_TTL
  )
  return null
}

async function rememberPurchase(purchase: OfficialPurchase) {
  await writeKv(
    purchaseKey(purchase.productId),
    JSON.stringify({
      ok: true,
      productId: purchase.productId,
      purchaseUrl: purchase.purchaseUrl,
      couponUrl: purchase.couponUrl,
      campaignName: purchase.campaignName,
      storeUrl: purchase.storeUrl
    }),
    PURCHASE_SUCCESS_TTL
  )
}

async function mintIds(
  ids: string[],
  quotes?: ReadonlyMap<string, StoreQuote>
): Promise<OfficialPurchase | null> {
  let calls = 0
  for (const id of ids) {
    if (await halted()) return null
    const joining = inflight.has(`purchase:${id}`)
    if (!joining) {
      const cached = await readPurchaseCache(id)
      if (cached.state === 'ready') {
        const enriched = toPurchase({
          ...cached.purchase,
          storeUrl: quotes?.get(id)?.url ?? cached.purchase.storeUrl
        })
        if (enriched && enriched.storeUrl !== cached.purchase.storeUrl) {
          await rememberPurchase(enriched)
        }
        return enriched
      }
      if (cached.state === 'negative') continue
      if (calls >= MAX_PURCHASE_CALLS) break
      calls += 1
    }
    const purchase = await singleFlight(`purchase:${id}`, () => fetchPurchase(id))
    if (!purchase) continue
    const enriched = toPurchase({
      ...purchase,
      storeUrl: quotes?.get(id)?.url ?? purchase.storeUrl
    })
    if (enriched && enriched.storeUrl !== purchase.storeUrl) {
      await rememberPurchase(enriched)
    }
    return enriched
  }
  return null
}

function candidateKey(vndbId: string) {
  return `nextmoe:dlsite-candidates:${vndbId}`
}

async function readCandidateCache(vndbId: string): Promise<CandidateCache> {
  const raw = await readKv(candidateKey(vndbId))
  if (!raw) return { state: 'miss' }
  try {
    const parsed = candidateSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return { state: 'miss' }
    const ids: string[] = []
    const workIds: string[] = []
    const sourceIds = Array.isArray(parsed.data) ? parsed.data : parsed.data.ids
    const sourceWorkIds = Array.isArray(parsed.data) ? [] : parsed.data.workIds
    for (const item of sourceIds) {
      const id = canonicalProductId(item)
      if (!id || ids.includes(id)) return { state: 'miss' }
      ids.push(id)
    }
    for (const item of sourceWorkIds) {
      if (!/^[0-9]+$/.test(item) || workIds.includes(item)) return { state: 'miss' }
      workIds.push(item)
    }
    if (ids.length > 1 && workIds.length === 0) return { state: 'miss' }
    return { state: 'ready', ids, workIds }
  } catch {
    return { state: 'miss' }
  }
}

async function rememberCandidates(
  vndbId: string,
  ids: string[],
  workIds: string[]
) {
  await writeKv(
    candidateKey(vndbId),
    JSON.stringify({ ids, workIds }),
    ids.length > 0 ? CANDIDATE_TTL : CANDIDATE_EMPTY_TTL
  )
}

async function fetchCandidates(
  vndbId: string
): Promise<{ ids: string[]; workIds: string[] }> {
  const cached = await readCandidateCache(vndbId)
  if (cached.state === 'ready') return { ids: cached.ids, workIds: cached.workIds }
  if (await halted()) return { ids: [], workIds: [] }

  // 这部作品已经在页面上，含 R18。不传 nsfw 会把这些条目藏掉，已有数据就接不到购买链接。
  const response = await nextmoeGet('/v2/catalog/works', {
    refs: `vndb:${vndbId}`,
    include: 'refs',
    nsfw: true
  })
  if (response.status !== 200) {
    await noteAuthFailure(response.status, response.data, response.retryAfter)
    return { ids: [], workIds: [] }
  }

  const parsed = listSchema.safeParse(response.data)
  if (!parsed.success) return { ids: [], workIds: [] }
  const items = parsed.data.items ?? []
  const ids: string[] = []
  const workIds: string[] = []
  for (const item of items) {
    const workId = String(item.id).trim()
    let contributed = false
    for (const ref of item.refs ?? []) {
      if (ref.source?.toLowerCase() !== 'dlsite') continue
      const id = ref.external_id ? canonicalProductId(ref.external_id) : null
      if (!id) continue
      contributed = true
      if (!ids.includes(id)) ids.push(id)
    }
    if (contributed && /^[0-9]+$/.test(workId) && !workIds.includes(workId)) {
      workIds.push(workId)
    }
  }

  if (ids.length === 0 && items.some((item) => !Array.isArray(item.refs))) {
    return { ids: [], workIds: [] }
  }

  await rememberCandidates(vndbId, ids, workIds)
  return { ids, workIds }
}

async function fetchReleaseLangs(workIds: string[]): Promise<Map<string, number>> {
  const ranks = new Map<string, number>()
  await Promise.all(
    workIds.map(async (workId) => {
      let cursor: string | undefined
      for (let page = 0; page < 2; page += 1) {
        if (await halted()) return
        const params: Record<string, string | boolean> = {
          nsfw: true,
          limit: '100'
        }
        if (cursor) params.cursor = cursor
        const response = await nextmoeGet(
          `/v2/catalog/works/${encodeURIComponent(workId)}/releases`,
          params
        )
        if (response.status !== 200) {
          await noteAuthFailure(response.status, response.data, response.retryAfter)
          return
        }
        const parsed = releaseListSchema.safeParse(response.data)
        if (!parsed.success) return
        const releases = (parsed.data.items ?? []) as ReleaseLangRef[]
        for (const [id, rank] of bestLanguageRanks(releases)) {
          const previous = ranks.get(id)
          if (previous === undefined || rank < previous) ranks.set(id, rank)
        }
        const next = parsed.data.next_cursor
        if (!next || !next.startsWith('cur_')) return
        cursor = next
      }
    })
  )
  return ranks
}

function rememberQuote(ranks: Map<string, StoreQuote>, quote: StoreQuote & { id: string }) {
  const previous = ranks.get(quote.id)
  if (!previous) {
    ranks.set(quote.id, quote)
    return
  }
  const previousJp = previous.region === 'jp'
  const nextJp = quote.region === 'jp'
  if (!previousJp && nextJp) {
    ranks.set(quote.id, quote)
    return
  }
  if (previousJp && !nextJp) return
  const stateOrder = (state: string) =>
    state === 'priced' ? 0 : state === 'pending' ? 1 : 2
  if (stateOrder(quote.state) < stateOrder(previous.state)) ranks.set(quote.id, quote)
}

async function fetchQuotes(workIds: string[]): Promise<Map<string, StoreQuote>> {
  const quotes = new Map<string, StoreQuote>()
  if (workIds.length === 0 || (await halted())) return quotes
  const response = await nextmoeGet(
    `/v2/store/prices?ids=${workIds.join(',')}`,
    undefined,
    false
  )
  if (response.status !== 200) return quotes
  const parsed = priceListSchema.safeParse(response.data)
  if (!parsed.success) return quotes
  for (const item of parsed.data.items ?? []) {
    for (const quote of item.quotes ?? []) {
      if (quote.source.toLowerCase() !== 'dlsite') continue
      const id = canonicalProductId(quote.external_id)
      if (!id) continue
      rememberQuote(quotes, {
        id,
        state: quote.quote_state,
        discount: quote.discount_percent ?? 0,
        url: quote.url ?? null,
        region: quote.region ?? ''
      })
    }
  }
  return quotes
}

async function resolveVndb(vndbId: string): Promise<OfficialPurchase | null> {
  const candidates = await singleFlight(`vndb:${vndbId}`, () =>
    fetchCandidates(vndbId)
  )
  if (candidates.ids.length === 0) return null
  if (candidates.ids.length === 1) return mintIds(candidates.ids)

  const [langs, quotes] = await Promise.all([
    fetchReleaseLangs(candidates.workIds),
    fetchQuotes(candidates.workIds)
  ])
  if (await halted()) return null
  const ranked = rankStoreProducts(candidates.ids, langs, quotes)
  if (ranked.length > 0) return mintIds(ranked, quotes)
  const priced = candidates.ids.filter((id) => quotes.get(id)?.state === 'priced')
  if (priced.length === 1) return mintIds(priced, quotes)
  return null
}

async function resolve(input: PurchaseInput): Promise<OfficialPurchase | null> {
  if (!readApiKey()) return null
  if (await halted()) return null

  const storedId = normalizeDlsiteProductId(input.dlsiteId)
  if (storedId) return mintIds([storedId])

  const officialId = officialProductId(input.officialHrefs)
  if (officialId) return mintIds([officialId])

  if (typeof input.vndbId !== 'string' || !input.vndbId.trim()) return null
  const parsed = parseVndbWorkId(input.vndbId)
  if (!parsed.ok) return null
  return resolveVndb(parsed.id)
}

function flightKey(input: PurchaseInput): string {
  const storedId = normalizeDlsiteProductId(input.dlsiteId)
  if (storedId) return `purchase-resolve:${storedId}`
  const officialId = officialProductId(input.officialHrefs)
  if (officialId) return `purchase-resolve:${officialId}`
  if (typeof input.vndbId === 'string') {
    const parsed = parseVndbWorkId(input.vndbId)
    if (parsed.ok) return `purchase-resolve:${parsed.id}`
  }
  return 'purchase-resolve:none'
}

export async function resolveOfficialPurchase(
  input: PurchaseInput
): Promise<OfficialPurchase | null> {
  try {
    const work = singleFlight(flightKey(input), () => resolve(input))
    void work.catch(() => undefined)
    return (await raceTimeout(work, PAGE_BUDGET_MS)) ?? null
  } catch {
    return null
  }
}

export type { OfficialPurchase }
