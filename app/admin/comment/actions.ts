'use server'

import { z } from 'zod'
import { safeParseSchema } from '~/utils/actions/safeParseSchema'
import { getComment } from '~/app/api/admin/comment/get'
import { adminPaginationSchema } from '~/validations/admin'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'

export const kunGetActions = async (
  params: z.infer<typeof adminPaginationSchema>
) => {
  const input = safeParseSchema(adminPaginationSchema, params)
  if (typeof input === 'string') {
    return input
  }
  const payload = await verifyHeaderCookie()
  if (!payload) {
    return '用户登陆失效'
  }
  if (payload.role < 3) {
    return '本页面仅管理员可访问'
  }

  const response = await getComment(input)
  return response
}
