import { z } from 'zod'
import { parseVndbWorkId } from '~/utils/vndbId'
import { spiderHttp } from './_httpClient'

const NEXTMOE_BASE = 'https://api.nextmoe.dev'
const TIMEOUT_MS = 15_000
const LANG_ORDER = ['zh-Hans', 'zh', 'zh-Hant', 'ja', 'en'] as const
const LANG_RANK: Record<string, number> = {
  'zh-Hans': 0,
  zh: 1,
  'zh-Hant': 2,
  ja: 3,
  en: 4
}
const COMPANY_ROLES: Record<string, true> = {
  developer: true,
  publisher: true,
  circle: true
}

const AUTH_FAILED = 'NextMoe 认证失败'
const BAD_KEY = 'NEXTMOE_API_KEY 必须以 nmk_ 开头'
const NOT_FOUND = 'NextMoe 未收录该 VNDB 作品'
const RATE_LIMITED = 'NextMoe 限流，请稍后再试'
const UNAVAILABLE = 'NextMoe 暂时不可用'

const decimalId = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))

const localizedEntrySchema = z
  .object({
    value: z.string().nullish(),
    is_machine: z.boolean().nullish()
  })
  .passthrough()

const localizedSchema = z
  .object({
    'zh-Hans': localizedEntrySchema.nullish(),
    zh: localizedEntrySchema.nullish(),
    'zh-Hant': localizedEntrySchema.nullish(),
    ja: localizedEntrySchema.nullish(),
    en: localizedEntrySchema.nullish()
  })
  .passthrough()

const imageSchema = z
  .object({
    url: z.string().nullish(),
    sexual: z.string().nullish(),
    width: z.number().nullish(),
    height: z.number().nullish()
  })
  .passthrough()

const titleSchema = z
  .object({
    lang: z.string().nullish(),
    title: z.string().nullish(),
    title_kind: z.string().nullish(),
    is_machine: z.boolean().nullish()
  })
  .passthrough()

const workSchema = z
  .object({
    display_name: z.string().nullish(),
    localized: localizedSchema.nullish(),
    titles: z.array(titleSchema).nullish(),
    intros: z
      .array(
        z
          .object({
            lang: z.string().nullish(),
            value: z.string().nullish(),
            is_machine: z.boolean().nullish()
          })
          .passthrough()
      )
      .nullish(),
    release_date: z.string().nullish(),
    release_date_precision: z.enum(['day', 'month', 'year']).nullish(),
    content_rating: z.string().nullish(),
    content_limit: z.string().nullish(),
    refs: z
      .array(
        z
          .object({
            source: z.string().nullish(),
            external_id: z.string().nullish()
          })
          .passthrough()
      )
      .nullish(),
    tags: z
      .array(
        z
          .object({
            id: z.union([z.string(), z.number()]).nullish(),
            tag_kind: z.string().nullish(),
            tier: z.string().nullish(),
            display_name: z.string().nullish(),
            source: z.string().nullish(),
            spoiler: z.string().nullish(),
            is_sexual: z.boolean().nullish(),
            work_count: z.number().nullish()
          })
          .passthrough()
      )
      .nullish(),
    cover: imageSchema.nullish(),
    banner: imageSchema.nullish(),
    covers: z
      .array(
        imageSchema
          .extend({
            cover_kind: z.string().nullish(),
            portrait_pinned: z.boolean().nullish(),
            image: imageSchema.nullish()
          })
          .passthrough()
      )
      .nullish(),
    screenshots: z.array(imageSchema).nullish(),
    links: z
      .array(
        z
          .object({
            source: z.string().nullish(),
            url: z.string().nullish()
          })
          .passthrough()
      )
      .nullish(),
    companies: z
      .array(
        z
          .object({
            id: decimalId.nullish(),
            display_name: z.string().nullish(),
            localized: localizedSchema.nullish(),
            attribution_role: z.string().nullish()
          })
          .passthrough()
      )
      .nullish()
  })
  .passthrough()

const listSchema = z
  .object({
    items: z.array(z.object({ id: decimalId }).passthrough()).nullish(),
    missing: z.array(z.string()).nullish()
  })
  .passthrough()

const problemSchema = z
  .object({
    code: z.string().nullish(),
    current_id: decimalId.nullish()
  })
  .passthrough()

type NextMoeWork = z.infer<typeof workSchema>
type Localized = z.infer<typeof localizedSchema>

export class NextMoeError extends Error {
  readonly status: number
  readonly body: { error: string }
  readonly retryAfterSec: number | null

  constructor(
    status: number,
    message: string,
    retryAfterSec: number | null = null
  ) {
    super(message)
    this.name = 'NextMoeError'
    this.status = status
    this.body = { error: message }
    this.retryAfterSec = retryAfterSec
  }
}

export type NormalizedVndbRef = {
  kind: 'v' | 'r'
  id: string
}

export type SpiderCompany = {
  id: string
  name: string
  original: string
  type: string
}

export type SpiderMetadata = {
  name: string | null
  introduction: string | null
  released: string | null
  vndbId: string | null
  alias: string[]
  tag: string[]
  banner: string | null
  screenshots: string[]
  website: string
  contentLimit: 'sfw' | 'nsfw'
  companies: SpiderCompany[]
}

type TextRow = {
  lang: string
  text: string
  machine: boolean
  official: boolean
}

export function normalizeVndbInput(raw: string): NormalizedVndbRef {
  const parsed = parseVndbWorkId(raw)
  if (!parsed.ok) throw new NextMoeError(400, parsed.message)
  return { kind: 'v', id: parsed.id }
}

function nonempty(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length > 0 ? text : null
}

function pickLocalized(localized: Localized | null | undefined): string | null {
  if (!localized) return null
  for (const lang of LANG_ORDER) {
    const text = nonempty(localized[lang]?.value)
    if (text) return text
  }
  return null
}

function compareRows(a: TextRow, b: TextRow): number {
  const byLang = LANG_RANK[a.lang] - LANG_RANK[b.lang]
  if (byLang !== 0) return byLang
  const byKind = Number(!a.official) - Number(!b.official)
  if (byKind !== 0) return byKind
  return Number(a.machine) - Number(b.machine)
}

function titleRows(work: NextMoeWork): TextRow[] {
  const rows: TextRow[] = []
  for (const title of work.titles ?? []) {
    const text = nonempty(title.title)
    if (!text || !(title.lang && title.lang in LANG_RANK)) continue
    rows.push({
      lang: title.lang,
      text,
      machine: title.is_machine === true,
      official: title.title_kind === 'official'
    })
  }
  return rows
}

function winningTitle(work: NextMoeWork): string | null {
  const rows = titleRows(work)
  if (rows.length > 0) {
    const bestLang = Math.min(...rows.map((row) => LANG_RANK[row.lang]))
    const inLang = rows
      .filter((row) => LANG_RANK[row.lang] === bestLang)
      .sort(compareRows)
    return inLang[0].text
  }
  return pickLocalized(work.localized) ?? nonempty(work.display_name)
}

function winningIntro(work: NextMoeWork): string | null {
  const rows: TextRow[] = []
  for (const intro of work.intros ?? []) {
    const text = nonempty(intro.value)
    if (!text || !(intro.lang && intro.lang in LANG_RANK)) continue
    rows.push({
      lang: intro.lang,
      text,
      machine: intro.is_machine === true,
      official: true
    })
  }
  if (rows.length === 0) return null
  const bestLang = Math.min(...rows.map((row) => LANG_RANK[row.lang]))
  const inLang = rows.filter((row) => LANG_RANK[row.lang] === bestLang)
  inLang.sort((a, b) => Number(a.machine) - Number(b.machine))
  return inLang[0].text
}

function formatReleased(work: NextMoeWork): string | null {
  const raw = work.release_date
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  if (work.release_date_precision === 'year') return raw.slice(0, 4)
  if (work.release_date_precision === 'month') return raw.slice(0, 7)
  return raw
}

function canonicalVndbId(
  work: NextMoeWork,
  input: NormalizedVndbRef
): string | null {
  if (input.kind === 'v') return input.id
  for (const ref of work.refs ?? []) {
    const externalId = nonempty(ref.external_id)
    if (ref.source === 'vndb' && externalId && /^v\d+$/i.test(externalId)) {
      return externalId.toLowerCase()
    }
  }
  return null
}

function pushUnique(
  out: string[],
  seen: Set<string>,
  value: string | null | undefined,
  exclude: string | null,
  cap: number
) {
  const text = nonempty(value)
  if (!text || text === exclude || seen.has(text) || out.length >= cap) return
  seen.add(text)
  out.push(text)
}

function buildAlias(work: NextMoeWork, name: string | null): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const titles = titleRows(work)
  for (const row of titles.filter((item) => item.official).sort(compareRows)) {
    pushUnique(out, seen, row.text, name, 40)
  }
  for (const row of titles.filter((item) => !item.official).sort(compareRows)) {
    pushUnique(out, seen, row.text, name, 40)
  }
  for (const title of work.titles ?? []) {
    const text = nonempty(title.title)
    if (!text || (title.lang && title.lang in LANG_RANK)) continue
    pushUnique(out, seen, text, name, 40)
  }
  for (const lang of LANG_ORDER)
    pushUnique(out, seen, work.localized?.[lang]?.value, name, 40)
  pushUnique(out, seen, work.display_name, name, 40)
  return out
}

const FIXED_TAGS = ['PC', 'Galgame']
const UNSAFE_SEXUAL: Record<string, true> = {
  explicit: true,
  suggestive: true
}
const ADULT_RATINGS: Record<string, true> = {
  r18: true,
  r18g: true,
  rx: true,
  nsfw: true,
  adult: true
}

function isUnsafeSexual(sexual: string | null | undefined) {
  return typeof sexual === 'string' && sexual in UNSAFE_SEXUAL
}

function deriveContentLimit(work: NextMoeWork): 'sfw' | 'nsfw' {
  const rating = (work.content_rating ?? '').toLowerCase()
  if (rating in ADULT_RATINGS) return 'nsfw'
  if ((work.content_limit ?? '').toLowerCase() === 'nsfw') return 'nsfw'
  if ((work.tags ?? []).some((tag) => tag.is_sexual === true)) return 'nsfw'
  if (collectCovers(work).some((cover) => isUnsafeSexual(cover.sexual))) {
    return 'nsfw'
  }
  if ((work.screenshots ?? []).some((shot) => isUnsafeSexual(shot.sexual))) {
    return 'nsfw'
  }
  return 'sfw'
}

function buildTags(work: NextMoeWork): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const year = work.release_date?.slice(0, 4)
  if (year && /^\d{4}$/.test(year)) pushUnique(out, seen, year, null, 43)
  for (const tag of FIXED_TAGS) pushUnique(out, seen, tag, null, 43)
  for (const tag of work.tags ?? []) {
    if (tag.is_sexual === true) continue
    if (tag.spoiler && tag.spoiler !== 'none') continue
    if (tag.tier === 'hidden') continue
    const name = nonempty(tag.display_name)
    if (!name || name.length > 100) continue
    pushUnique(out, seen, name, null, 43)
  }
  return out
}

const COVER_KIND_RANK: Record<string, number> = {
  pkgfront: 0,
  dig: 1,
  main: 2,
  pkgmed: 3,
  pkgback: 4
}

type CoverCandidate = {
  url: string
  width: number | null
  height: number | null
  sexual: string | null
  coverKind: string | null
  portraitPinned: boolean
}

function isVerticalCover(cover: CoverCandidate): boolean {
  return (
    cover.width !== null && cover.height !== null && cover.height > cover.width
  )
}

function pushCover(
  out: CoverCandidate[],
  seen: Set<string>,
  image:
    | {
        url?: string | null
        sexual?: string | null
        width?: number | null
        height?: number | null
      }
    | null
    | undefined,
  coverKind: string | null,
  portraitPinned: boolean
) {
  const url = nonempty(image?.url)
  if (!url || seen.has(url)) return
  seen.add(url)
  out.push({
    url,
    width: typeof image?.width === 'number' ? image.width : null,
    height: typeof image?.height === 'number' ? image.height : null,
    sexual: image?.sexual ?? null,
    coverKind,
    portraitPinned
  })
}

function collectCovers(work: NextMoeWork): CoverCandidate[] {
  const out: CoverCandidate[] = []
  const seen = new Set<string>()
  for (const item of work.covers ?? []) {
    const pinned = item.portrait_pinned === true
    const kind = item.cover_kind ?? null
    pushCover(out, seen, item, kind, pinned)
    pushCover(out, seen, item.image, kind, pinned)
  }
  pushCover(out, seen, work.cover, 'main', false)
  pushCover(out, seen, work.banner, null, false)
  return out
}

function compareCovers(a: CoverCandidate, b: CoverCandidate): number {
  const byVertical = Number(isVerticalCover(b)) - Number(isVerticalCover(a))
  if (byVertical !== 0) return byVertical
  const byExplicit =
    Number(a.sexual === 'explicit') - Number(b.sexual === 'explicit')
  if (byExplicit !== 0) return byExplicit
  const byPinned = Number(b.portraitPinned) - Number(a.portraitPinned)
  if (byPinned !== 0) return byPinned
  const byKind =
    (COVER_KIND_RANK[a.coverKind ?? ''] ?? 9) -
    (COVER_KIND_RANK[b.coverKind ?? ''] ?? 9)
  if (byKind !== 0) return byKind
  return (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0)
}
function usableImageUrl(
  image: { url?: string | null; sexual?: string | null } | null | undefined
): string | null {
  if (!image || isUnsafeSexual(image.sexual)) return null
  return nonempty(image.url)
}

function buildBanner(work: NextMoeWork): string | null {
  const covers = collectCovers(work)
    .filter((cover) => !isUnsafeSexual(cover.sexual))
    .sort(compareCovers)
  return covers[0]?.url ?? null
}

function buildScreenshots(
  work: NextMoeWork,
  bannerUrl: string | null
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  if (bannerUrl) seen.add(bannerUrl)
  for (const shot of work.screenshots ?? []) {
    const url = usableImageUrl(shot)
    if (!url || seen.has(url) || out.length >= 12) continue
    seen.add(url)
    out.push(url)
  }
  return out
}

const WEBSITE_DENY_HOSTS = [
  'patch.moe',
  'kungal.com',
  'wikidata.org',
  'x.com',
  'twitter.com',
  'vndb.org',
  'bangumi.tv',
  'bgm.tv',
  'dlsite.com',
  'dlsite.jp',
  'steampowered.com',
  'steamcommunity.com',
  'getchu.com',
  'erogamescape.org'
]

function isPublishableWebsite(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    if (
      WEBSITE_DENY_HOSTS.some(
        (denied) => host === denied || host.endsWith(`.${denied}`)
      )
    ) {
      return false
    }
    return !parsed.pathname.toLowerCase().endsWith('/download.html')
  } catch {
    return false
  }
}

function buildWebsite(work: NextMoeWork): string {
  for (const link of work.links ?? []) {
    if (link.source !== 'official_site') continue
    const url = nonempty(link.url)
    if (url && isPublishableWebsite(url)) return url
  }
  return ''
}

function buildCompanies(work: NextMoeWork): SpiderCompany[] {
  const rows = work.companies ?? []
  const matched = rows.filter(
    (row) => !!row.attribution_role && row.attribution_role in COMPANY_ROLES
  )
  const selected = matched.length > 0 ? matched : rows
  return selected.map((row) => {
    const display = nonempty(row.display_name) ?? ''
    const ja = nonempty(row.localized?.ja?.value)
    return {
      id: row.id ?? '',
      name: pickLocalized(row.localized) ?? display,
      original: ja ?? display,
      type: row.attribution_role ?? ''
    }
  })
}

export function mapNextMoeWork(
  work: unknown,
  input: NormalizedVndbRef
): SpiderMetadata {
  const parsed = workSchema.safeParse(work)
  const record = parsed.success ? parsed.data : workSchema.parse({})
  const name = winningTitle(record)
  const banner = buildBanner(record)
  return {
    name,
    introduction: winningIntro(record),
    released: formatReleased(record),
    vndbId: canonicalVndbId(record, input),
    alias: buildAlias(record, name),
    tag: buildTags(record),
    banner,
    screenshots: buildScreenshots(record, banner),
    website: buildWebsite(record),
    contentLimit: deriveContentLimit(record),
    companies: buildCompanies(record)
  }
}

const detailParams = {
  nsfw: true,
  spoiler: 'minor',
  include: 'titles,refs,intros,companies,links,screenshots,covers,tags'
} as const

function failStatus(status: number, headers?: unknown): never {
  if (status === 429) {
    let raw: unknown
    if (
      headers &&
      typeof headers === 'object' &&
      'get' in headers &&
      typeof headers.get === 'function'
    ) {
      raw = headers.get('retry-after')
    }
    const sec =
      typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : NaN
    throw new NextMoeError(
      429,
      RATE_LIMITED,
      Number.isFinite(sec) && sec > 0 ? sec : null
    )
  }
  if (status === 401 || status === 403) throw new NextMoeError(502, AUTH_FAILED)
  if (status === 404) throw new NextMoeError(404, NOT_FOUND)
  throw new NextMoeError(502, UNAVAILABLE)
}

async function nextmoeGet(
  path: string,
  params: Record<string, string | boolean>
) {
  const key = process.env.NEXTMOE_API_KEY?.trim()
  if (key && !key.startsWith('nmk_')) throw new NextMoeError(502, BAD_KEY)
  const headers = key ? { Authorization: `Bearer ${key}` } : undefined
  try {
    return await spiderHttp.get(`${NEXTMOE_BASE}${path}`, {
      params,
      headers,
      timeout: TIMEOUT_MS,
      validateStatus: () => true
    })
  } catch (error) {
    if (error instanceof NextMoeError) throw error
    throw new NextMoeError(502, UNAVAILABLE)
  }
}

async function fetchDetail(catalogId: string) {
  const first = await nextmoeGet(
    `/v2/catalog/works/${encodeURIComponent(catalogId)}`,
    { ...detailParams }
  )
  if (first.status === 200) return first.data

  const problem = problemSchema.safeParse(first.data)
  const mergedId = problem.success ? problem.data.current_id : undefined
  if (
    first.status === 404 &&
    problem.success &&
    problem.data.code === 'ENTITY_MERGED' &&
    mergedId &&
    mergedId !== catalogId
  ) {
    const retry = await nextmoeGet(
      `/v2/catalog/works/${encodeURIComponent(mergedId)}`,
      { ...detailParams }
    )
    if (retry.status === 200) return retry.data
    failStatus(retry.status, retry.headers)
  }

  failStatus(first.status, first.headers)
}

export async function fetchNextMoeMetadata(
  vndbId: string
): Promise<SpiderMetadata> {
  const input = normalizeVndbInput(vndbId)
  const ref = `vndb:${input.id}`
  const listed = await nextmoeGet('/v2/catalog/works', {
    refs: ref,
    nsfw: true
  })
  if (listed.status !== 200) failStatus(listed.status, listed.headers)

  const body = listSchema.safeParse(listed.data)
  if (!body.success) throw new NextMoeError(502, UNAVAILABLE)
  const missing = (body.data.missing ?? []).some(
    (item) => item.toLowerCase() === ref
  )
  const catalogId = body.data.items?.[0]?.id
  if (missing || !catalogId) throw new NextMoeError(404, NOT_FOUND)

  const detail = workSchema.safeParse(await fetchDetail(catalogId))
  if (!detail.success) throw new NextMoeError(502, UNAVAILABLE)
  return mapNextMoeWork(detail.data, input)
}
