'use server'

import { z } from 'zod'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'
import { safeParseSchema } from '~/utils/actions/safeParseSchema'
import {
  getProfileSchema,
  getUserProfile
} from '~/app/api/user/status/info/getUserProfile'

export const kunGetActions = async (id: number) => {
  const input = safeParseSchema(getProfileSchema, { id })
  if (typeof input === 'string') {
    return input
  }
  const payload = await verifyHeaderCookie()

  const user = await getUserProfile(input, {
    uid: payload?.uid ?? 0,
    role: payload?.role ?? 0
  })
  return user
}
