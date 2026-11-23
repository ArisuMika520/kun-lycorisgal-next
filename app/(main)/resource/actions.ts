'use server'

import { z } from 'zod'
import { safeParseSchema } from '~/utils/actions/safeParseSchema'
import { resourceSchema } from '~/validations/resource'
import { getPatchResource } from '~/app/api/resource/route'
import { getNSFWHeader } from '~/utils/actions/getNSFWHeader'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'

export const kunGetActions = async (params: z.infer<typeof resourceSchema>) => {
  const input = safeParseSchema(resourceSchema, params)
  if (typeof input === 'string') {
    return input
  }

  const nsfwEnable = await getNSFWHeader()

  const payload = await verifyHeaderCookie()
  const response = await getPatchResource(input, nsfwEnable, payload?.uid ?? 0)
  return response
}
