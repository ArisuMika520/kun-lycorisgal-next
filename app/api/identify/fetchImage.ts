import { guardOutboundUrl } from '~/utils/ssrfGuard'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_REDIRECTS = 3
const FETCH_TIMEOUT_MS = 15000
const PUBLIC_HOST = /^.+$/

const ALLOWED_TYPES: Record<string, true> = {
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  'image/webp': true,
  'image/gif': true
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
}

export type FetchedImage =
  | { ok: true; bytes: ArrayBuffer; mime: string }
  | { ok: false; status: number; error: string }

const mimeFrom = (contentType: string, url: URL) => {
  const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  if (ALLOWED_TYPES[mime]) {
    return mime === 'image/jpg' ? 'image/jpeg' : mime
  }
  if (mime && mime !== 'application/octet-stream') {
    return ''
  }
  const ext = url.pathname.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MIME[ext] ?? ''
}

export const fetchIdentifyImage = async (
  raw: string
): Promise<FetchedImage> => {
  const guarded = await guardOutboundUrl(raw, { allowHosts: [PUBLIC_HOST] })
  if (!guarded.ok || !guarded.url) {
    return { ok: false, status: 400, error: '图片链接无效' }
  }

  let target = guarded.url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(target, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'User-Agent': 'LycorisGAL-Identify/1.0'
        }
      })
    } catch {
      return { ok: false, status: 400, error: '无法获取图片' }
    } finally {
      clearTimeout(timeout)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || hop === MAX_REDIRECTS) {
        return { ok: false, status: 400, error: '图片链接无效' }
      }
      const next = await guardOutboundUrl(
        new URL(location, target).toString(),
        {
          allowHosts: [PUBLIC_HOST]
        }
      )
      if (!next.ok || !next.url) {
        return { ok: false, status: 400, error: '图片链接无效' }
      }
      target = next.url
      continue
    }

    if (!response.ok) {
      return { ok: false, status: 400, error: '无法获取图片' }
    }

    const mime = mimeFrom(response.headers.get('content-type') ?? '', target)
    if (!mime) {
      return { ok: false, status: 400, error: '链接不是支持的图片' }
    }

    const declared = Number(response.headers.get('content-length') || 0)
    if (declared > MAX_IMAGE_BYTES) {
      return { ok: false, status: 413, error: '图片过大，请压缩到 8MB 以内' }
    }

    const bytes = await response.arrayBuffer()
    if (bytes.byteLength <= 0) {
      return { ok: false, status: 400, error: '图片为空' }
    }
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      return { ok: false, status: 413, error: '图片过大，请压缩到 8MB 以内' }
    }

    return { ok: true, bytes, mime }
  }

  return { ok: false, status: 400, error: '图片链接无效' }
}
