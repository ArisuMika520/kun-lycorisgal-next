import { lookup } from 'dns/promises'
import { isIP } from 'net'

const PRIVATE_V4_BLOCKS: ReadonlyArray<[number, number]> = [
  [0x00000000, 8],   // 0.0.0.0/8
  [0x0a000000, 8],   // 10.0.0.0/8
  [0x7f000000, 8],   // 127.0.0.0/8
  [0xa9fe0000, 16],  // 169.254.0.0/16 (link-local + cloud metadata)
  [0xac100000, 12],  // 172.16.0.0/12
  [0xc0a80000, 16],  // 192.168.0.0/16
  [0xe0000000, 4],   // 224.0.0.0/4 multicast
  [0xf0000000, 4]    // 240.0.0.0/4 reserved
]

const ipv4ToInt = (ip: string): number | null => {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    const v = Number(p)
    if (!Number.isInteger(v) || v < 0 || v > 255) return null
    n = (n << 8) + v
  }
  return n >>> 0
}

const isPrivateIPv4 = (ip: string): boolean => {
  const n = ipv4ToInt(ip)
  if (n === null) return false
  return PRIVATE_V4_BLOCKS.some(
    ([base, bits]) => (n >>> (32 - bits)) === (base >>> (32 - bits))
  )
}

const isPrivateIPv6 = (ip: string): boolean => {
  const lower = ip.toLowerCase()
  if (lower === '::' || lower === '::1') return true
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true
  // IPv4-mapped ::ffff:a.b.c.d
  const mapped = lower.match(/^::ffff:([0-9.]+)$/)
  if (mapped && isPrivateIPv4(mapped[1])) return true
  return false
}

const isPrivateIp = (ip: string): boolean => {
  const v = isIP(ip)
  if (v === 4) return isPrivateIPv4(ip)
  if (v === 6) return isPrivateIPv6(ip)
  return false
}

interface GuardOptions {
  allowHosts: ReadonlyArray<string | RegExp>
}

export interface GuardResult {
  ok: boolean
  reason?: string
  url?: URL
}

const hostMatches = (
  host: string,
  allowHosts: ReadonlyArray<string | RegExp>
): boolean => {
  const lower = host.toLowerCase()
  return allowHosts.some((entry) => {
    if (entry instanceof RegExp) return entry.test(lower)
    const allowed = entry.toLowerCase()
    return lower === allowed || lower.endsWith(`.${allowed}`)
  })
}

export const guardOutboundUrl = async (
  raw: string,
  options: GuardOptions
): Promise<GuardResult> => {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: 'invalid URL' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: `disallowed protocol: ${url.protocol}` }
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'embedded credentials are not allowed' }
  }

  const host = url.hostname
  if (!hostMatches(host, options.allowHosts)) {
    return { ok: false, reason: `host not in allowlist: ${host}` }
  }

  // If host is a literal IP, check directly; otherwise resolve DNS to catch
  // attacker tricks like a record pointing to 127.0.0.1.
  if (isIP(host)) {
    if (isPrivateIp(host)) {
      return { ok: false, reason: `private IP literal: ${host}` }
    }
  } else {
    try {
      const addrs = await lookup(host, { all: true, verbatim: true })
      for (const a of addrs) {
        if (isPrivateIp(a.address)) {
          return {
            ok: false,
            reason: `host ${host} resolves to private address ${a.address}`
          }
        }
      }
    } catch (e) {
      return { ok: false, reason: `DNS lookup failed for ${host}` }
    }
  }

  return { ok: true, url }
}
