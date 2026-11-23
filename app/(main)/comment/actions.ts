'use server'

import { z } from 'zod'
import { safeParseSchema } from '~/utils/actions/safeParseSchema'
import { commentSchema } from '~/validations/comment'
import { getComment } from '~/app/api/comment/route'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'

export const kunGetActions = async (params: z.infer<typeof commentSchema>) => {
  const input = safeParseSchema(commentSchema, params)
  if (typeof input === 'string') {
    return input
  }

  const payload = await verifyHeaderCookie()
  const response = await getComment(input, payload?.uid ?? 0)
  return response
}
