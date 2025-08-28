import { kunAuthMiddleware } from '~/middleware/auth'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}

export const middleware = async (request: NextRequest) => {
  return kunAuthMiddleware(request)
}
