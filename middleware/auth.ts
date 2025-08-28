import { NextResponse } from 'next/server'
import { parseCookies } from '~/utils/cookies'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/admin', '/comment', '/edit']
const userProtectedPaths = ['/user']

export const isProtectedRoute = (pathname: string) => {
  // API路由不需要认证
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

  if (isProtectedRoute(pathname) && !token) {
    return redirectToLogin(request)
  }

  return NextResponse.next()
}
