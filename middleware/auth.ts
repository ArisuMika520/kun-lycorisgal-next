import { NextResponse } from 'next/server'
import { parseCookies } from '~/utils/cookies'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/admin', '/comment', '/edit']
const userProtectedPaths = ['/user']

export const isProtectedRoute = (pathname: string) => {
  if (pathname.startsWith('/api/')) {
    return false
  }

  // 用户相关页面需要认证，但排除profile API和status API
  if (pathname.startsWith('/user/')) {
    return (
      !pathname.startsWith('/user/profile/') &&
      !pathname.startsWith('/user/status')
    )
  }

  return protectedPaths.some((path) => pathname.startsWith(path))
}

const redirectToLogin = (request: NextRequest) => {
  // RSC 预取会带 Origin/Referer。优先用它们生成同源登录地址,
  // 避免 standalone 内部把请求 URL 归一化成 localhost 后造成 CORS。
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const protocol = forwardedProto
    ? forwardedProto.split(',')[0].trim()
    : request.nextUrl.protocol.replace(':', '')
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const headerUrl = host ? `${protocol}://${host}` : undefined
  const baseUrl =
    request.headers.get('origin') ??
    request.headers.get('referer') ??
    headerUrl ??
    request.url
  const loginUrl = new URL('/login', baseUrl)
  return NextResponse.redirect(loginUrl)
}

const getToken = (request: NextRequest) => {
  const cookies = parseCookies(request.headers.get('cookie') ?? '')
  return cookies['kun-galgame-patch-moe-token']
}

export const kunAuthMiddleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl
  const token = getToken(request)
  const isRscRequest =
    request.url.includes('_rsc=') ||
    request.nextUrl.searchParams.has('_rsc') ||
    request.headers.get('rsc') === '1' ||
    request.headers.get('next-router-prefetch') === '1'

  // 后台 API: 边缘层先做存在性检查，避免未携带 token 的请求穿透到路由层。
  // 完整的角色/签名验证仍由各路由调用 verifyHeaderCookie 完成。
  if (pathname.startsWith('/api/admin/')) {
    if (!token) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (isProtectedRoute(pathname) && !token && isRscRequest) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 })
  }

  if (isProtectedRoute(pathname) && !token) {
    return redirectToLogin(request)
  }

  return NextResponse.next()
}
