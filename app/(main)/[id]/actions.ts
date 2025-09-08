'use server'

import { cache } from 'react'
import { z } from 'zod'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'
import { safeParseSchema } from '~/utils/actions/safeParseSchema'
import { getPatchById } from '~/app/api/patch/get'
import { getPatchIntroduction } from '~/app/api/patch/introduction/route'
import { updatePatchViews } from '~/app/api/patch/views/put'

const uniqueIdSchema = z.object({
  uniqueId: z.string().min(8).max(8)
})

export const kunGetPatchActions = cache(
  async (params: z.infer<typeof uniqueIdSchema>) => {
    const input = safeParseSchema(uniqueIdSchema, params)
    if (typeof input === 'string') {
      return input
    }
    const payload = await verifyHeaderCookie()

    const response = await getPatchById(input, payload?.uid ?? 0)
    return response
  }
)

export const kunGetPatchIntroductionActions = cache(
  async (params: z.infer<typeof uniqueIdSchema>) => {
    const input = safeParseSchema(uniqueIdSchema, params)
    if (typeof input === 'string') {
      return input
    }

    const response = await getPatchIntroduction(input)
    return response
  }
)

export const kunUpdatePatchViewsActions = async (
  params: z.infer<typeof uniqueIdSchema>
) => {
  const input = safeParseSchema(uniqueIdSchema, params)
  if (typeof input === 'string') {
    return input
  }

  await updatePatchViews(input.uniqueId)
}