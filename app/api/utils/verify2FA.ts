import jwt from 'jsonwebtoken'
import type { KunGalgameStatelessPayload } from '~/app/api/utils/jwt'

export const verify2FA = (token: string) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256']
    }) as KunGalgameStatelessPayload

    if (!payload.require2FA) {
      return null
    }

    return payload
  } catch (error) {
    return null
  }
}
