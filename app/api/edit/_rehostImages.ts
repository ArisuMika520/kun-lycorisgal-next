import { guardOutboundUrl } from '~/utils/ssrfGuard'
import {
  IMAGE_PROXY_ALLOW_HOSTS,
  MAX_PROXY_IMAGE_BYTES
} from '~/utils/imageProxyHosts'
import { uploadPatchImages } from './_upload'

const IMAGE_EXT_MIME: Record<string, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif'
}

const isOwnImageBed = (url: string) => {
  const host = process.env.KUN_VISUAL_NOVEL_IMAGE_BED_HOST
  const bed = process.env.KUN_VISUAL_NOVEL_IMAGE_BED_URL

  let image: URL
  try {
    image = new URL(url)
  } catch {
    return false
  }

  if (image.username || image.password) return false
  if (image.protocol !== 'http:' && image.protocol !== 'https:') return false

  let bedUrl: URL | null = null
  if (bed) {
    try {
      bedUrl = new URL(bed)
    } catch {
      bedUrl = null
    }
  }

  const hostMatch = Boolean(host && image.hostname === host.toLowerCase())
  const bedMatch = Boolean(
    bedUrl &&
      image.protocol === bedUrl.protocol &&
      image.hostname === bedUrl.hostname
  )
  if (!hostMatch && !bedMatch) return false
  if (!bedUrl) return true

  const prefix = bedUrl.pathname.replace(/\/+$/, '') || '/'
  if (prefix === '/') return true
  return image.pathname === prefix || image.pathname.startsWith(`${prefix}/`)
}

const downloadAllowedImage = async (
  url: string
): Promise<ArrayBuffer | null> => {
  const guard = await guardOutboundUrl(url, {
    allowHosts: IMAGE_PROXY_ALLOW_HOSTS
  })
  if (!guard.ok || !guard.url) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(guard.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual',
      signal: controller.signal
    })
    if (response.status >= 300 && response.status < 400) return null
    if (!response.ok) return null

    const upstreamContentType = (
      response.headers.get('content-type') || ''
    ).toLowerCase()
    const ext = guard.url.pathname.split('.').pop()?.toLowerCase() ?? ''
    const isImage =
      upstreamContentType.startsWith('image/') ||
      ((upstreamContentType === 'application/octet-stream' ||
        upstreamContentType === '') &&
        Boolean(IMAGE_EXT_MIME[ext]))
    if (!isImage) return null

    const declaredLen = Number(response.headers.get('content-length') || 0)
    if (declaredLen && declaredLen > MAX_PROXY_IMAGE_BYTES) return null

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_PROXY_IMAGE_BYTES) {
      return null
    }
    return buffer
  } catch (error) {
    console.error('[rehost] image download failed:', url, error)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export const rehostPatchImages = async (urls: string[], patchId: number) => {
  const kept: string[] = []
  const buffers: ArrayBuffer[] = []
  let failed = 0

  for (const url of urls) {
    if (!url) continue
    if (isOwnImageBed(url)) {
      kept.push(url)
      continue
    }
    const buffer = await downloadAllowedImage(url)
    if (!buffer) {
      failed += 1
      continue
    }
    buffers.push(buffer)
  }

  if (failed > 0) {
    throw new Error(`有 ${failed} 张截图无法转存`)
  }

  if (buffers.length === 0) return kept

  const uploaded = await uploadPatchImages(buffers, patchId)
  if (uploaded.length === 0) {
    throw new Error('游戏截图上传失败')
  }
  return [...kept, ...uploaded]
}
