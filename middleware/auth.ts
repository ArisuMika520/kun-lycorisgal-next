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
    return !pathname.startsWith('/user/profile/') && !pathname.startsWith('/user/status')
  }

  return protectedPaths.some((path) => pathname.startsWith(path))
}

const redirectToLogin = (request: NextRequest) => {
  const loginUrl = new URL('/login', request.url)
  // loginUrl.searchParams.set('from', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

const getToken = (request: NextRequest) => {
  const cookies = parseCookies(request.headers.get('cookie') ?? '')
  return cookies['kun-galgame-patch-moe-token']
}

export const kunAuthMiddleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl
  const token = getToken(request)

  // 后台 API: 边缘层先做存在性检查，避免未携带 token 的请求穿透到路由层。
  // 完整的角色/签名验证仍由各路由调用 verifyHeaderCookie 完成。
  if (pathname.startsWith('/api/admin/')) {
    if (!token) {
      return NextResponse.json(
        { error: '用户未登录' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  if (isProtectedRoute(pathname) && !token) {
    return redirectToLogin(request)
  }

  return NextResponse.next()
}
