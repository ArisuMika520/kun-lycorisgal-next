'use server'

import { z } from 'zod'
import { safeParseSchema } from '~/utils/actions/safeParseSchema'
import { topicListSchema } from '~/validations/topic'
import { getTopicList } from '~/app/api/topic/getTopicList'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'

export const kunGetTopicListActions = async (
  params: z.infer<typeof topicListSchema>
) => {
  const input = safeParseSchema(topicListSchema, params)
  if (typeof input === 'string') {
    return input
  }

  const payload = await verifyHeaderCookie()
  return getTopicList(input, payload?.uid ?? 0)
}
