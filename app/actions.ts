'use server'

import { setKUNGalgameTask } from '~/server/cron'

setKUNGalgameTask()

import { getNSFWHeader } from '~/utils/actions/getNSFWHeader'
import { getHomeData } from '~/app/api/home/route'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'

export const kunGetActions = async () => {
  const nsfwEnable = await getNSFWHeader()
  const payload = await verifyHeaderCookie()
  const response = await getHomeData(nsfwEnable, payload?.uid ?? 0)
  return response
}
