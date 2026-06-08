import { NextRequest, NextResponse } from 'next/server'
import { guardOutboundUrl } from '~/utils/ssrfGuard'

const PROXY_IMAGE_ALLOW_HOSTS = [
  'vndb.org',
  'steamstatic.com',
  'store.steampowered.com',
  'touchgaloss.com',
  'touchgalstatic.org',
  'r2.lycorisgal.com',
  'img.dlsite.jp',
  'file.dlsite.jp',
  'lain.bgm.tv'
] as const

const MAX_IMAGE_BYTES = 20 * 1024 * 1024

// Some object stores (notably Cloudflare R2) serve image objects such as
// .avif / .webp with a generic application/octet-stream content type. We accept
// those when the URL extension is a known image type and backfill the correct
// Content-Type so the browser actually renders them.
const IMAGE_EXT_MIME: Record<string, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif'
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    )
  }

  const guard = await guardOutboundUrl(url, {
    allowHosts: PROXY_IMAGE_ALLOW_HOSTS
  })
  if (!guard.ok) {
    console.warn('[proxy-image] blocked:', guard.reason, 'url:', url)
    return NextResponse.json({ error: 'URL is not allowed' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(guard.url!, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual',
      signal: controller.signal
    }).finally(() => clearTimeout(timeout))

    if (response.status >= 300 && response.status < 400) {
      return NextResponse.json(
        { error: 'Redirects are not allowed' },
        { status: 400 }
      )
    }
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      )
    }

    const upstreamContentType = (
      response.headers.get('content-type') || ''
    ).toLowerCase()
    const ext = guard.url!.pathname.split('.').pop()?.toLowerCase() ?? ''
    const extMime = IMAGE_EXT_MIME[ext]

    const isImageContentType = upstreamContentType.startsWith('image/')
    // Accept generic binary responses only when the URL extension proves it is
    // a known image type (covers R2 serving .avif as application/octet-stream).
    const isAllowedBinary =
      (upstreamContentType === 'application/octet-stream' ||
        upstreamContentType === '') &&
      Boolean(extMime)

    if (!isImageContentType && !isAllowedBinary) {
      return NextResponse.json(
        { error: 'Upstream is not an image' },
        { status: 400 }
      )
    }

    // Trust a real image/* type from upstream; otherwise backfill from the
    // extension so the browser receives a renderable Content-Type.
    const contentType = isImageContentType ? upstreamContentType : extMime!

    const declaredLen = Number(response.headers.get('content-length') || 0)
    if (declaredLen && declaredLen > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
