export const AFFILIATE_SHORT_HOST = 's.imoe.uk'

const PRODUCT_ID = /^(?:RJ|VJ)[0-9]{6,8}$/i
const PRODUCT_ID_IN_TEXT = /(?:RJ|VJ)[0-9]{6,8}/gi
const EMBEDDED_DLSITE_URL = /https?:\/\/[^\s<>"')\]]+/gi
const EMBEDDED_DLSITE_REF = /dlsite:(?:RJ|VJ)[0-9]{6,8}/gi

const OFFICIAL_LABELS = new Set([
  '官网',
  '官方网站',
  '官方站点',
  'official website',
  'official site'
])

const LANG_RANK: Record<string, number> = {
  'zh-hans': 0,
  zh: 1,
  'zh-hant': 2,
  ja: 3
}

export type OfficialPurchase = {
  productId: string
  purchaseUrl: string
  couponUrl: string | null
  campaignName: string | null
  storeUrl: string
}

export type StoreQuote = {
  state: string
  discount: number
  url: string | null
  region: string
}

export type ReleaseLangRef = {
  lang?: string | null
  refs?: Array<{
    source?: string | null
    external_id?: string | null
  }> | null
}

export function canonicalProductId(
  raw: string | null | undefined
): string | null {
  if (typeof raw !== 'string') return null
  const id = raw.trim()
  if (!PRODUCT_ID.test(id)) return null
  return id.toUpperCase()
}

export function isAffiliateShortUrl(raw: string | null | undefined): raw is string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 1024) {
    return false
  }
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    if (url.username || url.password) return false
    const host = url.hostname.toLowerCase().replace(/\.+$/, '')
    return host === AFFILIATE_SHORT_HOST
  } catch {
    return false
  }
}

function isDlsiteHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.+$/, '')
  return (
    host === 'dlsite.com' ||
    host === 'dlsite.jp' ||
    host.endsWith('.dlsite.com') ||
    host.endsWith('.dlsite.jp')
  )
}

function soleProductId(text: string): string | null {
  const matches = text.match(new RegExp(PRODUCT_ID_IN_TEXT.source, 'gi'))
  if (!matches) return null
  const unique: string[] = []
  for (const match of matches) {
    const id = canonicalProductId(match)
    if (!id || unique.includes(id)) continue
    unique.push(id)
  }
  return unique.length === 1 ? unique[0] : null
}

function idFromDlsiteUrl(text: string): string | null {
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!isDlsiteHost(url.hostname)) return null
  return soleProductId(text)
}

function idFromDlsiteRef(text: string): string | null {
  if (text.slice(0, 7).toLowerCase() !== 'dlsite:') return null
  return soleProductId(text)
}

export function normalizeDlsiteProductId(
  raw: string | null | undefined
): string | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text) return null
  return canonicalProductId(text) ?? idFromDlsiteRef(text) ?? idFromDlsiteUrl(text)
}

export function dlsiteWorkHref(productId: string, quoteUrl?: string | null): string {
  if (quoteUrl) {
    const fromQuote = idFromDlsiteUrl(quoteUrl)
    if (fromQuote === productId) {
      try {
        const url = new URL(quoteUrl)
        if (url.protocol === 'https:' && !url.username && !url.password) {
          return quoteUrl
        }
      } catch {
        // fall through to the stable work page
      }
    }
  }
  return `https://www.dlsite.com/home/work/=/product_id/${productId}.html`
}

function isOfficialLabel(label: string): boolean {
  return OFFICIAL_LABELS.has(label.split(',')[0].trim().toLowerCase())
}

function isHttpHref(href: string): boolean {
  try {
    const url = new URL(href.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function parseKunLinkAttrs(blob: string): Record<string, string> | null {
  const source = blob.trim()
  if (!source) return null
  const pattern = /\s*([A-Za-z_][\w:.-]*)="([^"]*)"/y
  const attrs: Record<string, string> = {}
  while (pattern.lastIndex < source.length) {
    const attr = pattern.exec(source)
    if (!attr) return null
    attrs[attr[1]] = attr[2]
  }
  return attrs
}

function pushHref(hrefs: string[], href: string | null | undefined) {
  if (!href || hrefs.includes(href)) return
  hrefs.push(href)
}

export function collectOfficialHrefs(input: {
  markdown?: string | null
  links?: Array<{ label: string; href: string }>
}): string[] {
  const hrefs: string[] = []
  for (const link of input.links ?? []) {
    if (isOfficialLabel(link.label) && isHttpHref(link.href)) {
      pushHref(hrefs, link.href.trim())
    }
  }

  const markdown = input.markdown ?? ''
  const kunLinkPattern = /::kun-link\{([^}]+)\}/g
  let match: RegExpExecArray | null = kunLinkPattern.exec(markdown)
  while (match) {
    const attrs = parseKunLinkAttrs(match[1])
    if (attrs && isOfficialLabel(attrs.text ?? '') && isHttpHref(attrs.href ?? '')) {
      pushHref(hrefs, attrs.href.trim())
    }
    match = kunLinkPattern.exec(markdown)
  }

  const markdownLinkPattern = /(?<!!)\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  match = markdownLinkPattern.exec(markdown)
  while (match) {
    if (isOfficialLabel(match[1]) && isHttpHref(match[2])) {
      pushHref(hrefs, match[2].trim())
    }
    match = markdownLinkPattern.exec(markdown)
  }
  return hrefs
}

export function officialProductId(
  hrefs: Array<string | null | undefined> | undefined
): string | null {
  if (!hrefs) return null
  const ids: string[] = []
  for (const href of hrefs) {
    if (typeof href !== 'string' || !href.trim()) continue
    const text = href.trim()
    const id =
      normalizeDlsiteProductId(text) ??
      idFromEmbedded(text)
    if (!id || ids.includes(id)) continue
    ids.push(id)
  }
  return ids.length === 1 ? ids[0] : null
}

function idFromEmbedded(text: string): string | null {
  const ids: string[] = []
  for (const match of text.matchAll(EMBEDDED_DLSITE_REF)) {
    const id = idFromDlsiteRef(match[0])
    if (id && !ids.includes(id)) ids.push(id)
  }
  for (const match of text.matchAll(EMBEDDED_DLSITE_URL)) {
    const id = idFromDlsiteUrl(match[0].replace(/[.,;]+$/, ''))
    if (id && !ids.includes(id)) ids.push(id)
  }
  return ids.length === 1 ? ids[0] : null
}

export function languageRank(lang: string | null | undefined): number {
  if (!lang) return 5
  return LANG_RANK[lang.toLowerCase()] ?? 4
}

export function bestLanguageRanks(
  releases: ReleaseLangRef[]
): Map<string, number> {
  const ranks = new Map<string, number>()
  for (const release of releases) {
    const rank = languageRank(release.lang)
    for (const ref of release.refs ?? []) {
      if (ref.source?.toLowerCase() !== 'dlsite') continue
      const id = ref.external_id ? canonicalProductId(ref.external_id) : null
      if (!id) continue
      const previous = ranks.get(id)
      if (previous === undefined || rank < previous) ranks.set(id, rank)
    }
  }
  return ranks
}

function stateRank(state: string | undefined): number {
  if (state === 'priced') return 0
  if (state === 'pending') return 1
  if (state === 'unavailable') return 2
  return 3
}

function prefixRank(id: string): number {
  if (id.startsWith('VJ')) return 0
  if (id.startsWith('RJ')) return 1
  return 2
}

export function compareProductId(a: string, b: string): number {
  if (a === b) return 0
  const byPrefix = prefixRank(a) - prefixRank(b)
  if (byPrefix !== 0) return byPrefix
  return Number(a.slice(2)) - Number(b.slice(2))
}

export function rankStoreProducts(
  ids: string[],
  langs: ReadonlyMap<string, number>,
  quotes: ReadonlyMap<string, StoreQuote>
): string[] {
  const unique: string[] = []
  for (const raw of ids) {
    const id = canonicalProductId(raw)
    if (!id || unique.includes(id)) continue
    unique.push(id)
  }
  if (unique.length <= 1) return unique
  const mentioned = unique.filter((id) => langs.has(id))
  if (mentioned.length === 0) return []

  const best = Math.min(...mentioned.map((id) => langs.get(id) ?? 9))
  const tier = (id: string) => {
    const inBest = langs.get(id) === best
    const state = quotes.get(id)?.state
    if (state === 'priced' && inBest) return 0
    if (state === 'priced') return 1
    if (state === 'pending' && inBest) return 2
    if (state === 'pending') return 3
    if (inBest) return 4
    return 5
  }

  return [...mentioned].sort((a, b) => {
    const byTier = tier(a) - tier(b)
    if (byTier !== 0) return byTier
    const byLang = (langs.get(a) ?? 9) - (langs.get(b) ?? 9)
    if (byLang !== 0) return byLang
    const byState = stateRank(quotes.get(a)?.state) - stateRank(quotes.get(b)?.state)
    if (byState !== 0) return byState
    const byPrefix = prefixRank(a) - prefixRank(b)
    if (byPrefix !== 0) return byPrefix
    const byDiscount = (quotes.get(b)?.discount ?? 0) - (quotes.get(a)?.discount ?? 0)
    if (byDiscount !== 0) return byDiscount
    return compareProductId(a, b)
  })
}

export function rewriteOfficialHrefs(
  value: string,
  hrefs: string[],
  purchaseUrl: string
): string {
  let next = value
  for (const href of hrefs) {
    if (!href || href === purchaseUrl) continue
    next = next.split(href).join(purchaseUrl)
    const escaped = href.replace(/&/g, '&amp;')
    if (escaped !== href) {
      next = next.split(escaped).join(purchaseUrl.replace(/&/g, '&amp;'))
    }
  }
  return next
}
