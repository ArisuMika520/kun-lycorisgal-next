import { kunAuthMiddleware } from '~/middleware/auth'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/api/admin/:path*'
  ]
}

export const middleware = async (request: NextRequest) => {
  return kunAuthMiddleware(request)
}
