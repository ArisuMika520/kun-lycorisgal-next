'use server'

import { getRedirectConfig } from '~/app/api/admin/setting/redirect/getRedirectConfig'
import { getDisableRegisterStatus } from '~/app/api/admin/setting/register/route'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'

export const kunGetRedirectConfigActions = async () => {
  const payload = await verifyHeaderCookie()
  if (!payload) {
    return '用户登陆失效'
  }
  if (payload.role < 3) {
    return '本页面仅管理员可访问'
  }

  const response = await getRedirectConfig()
  return response
}

export const kunGetDisableRegisterStatusActions = async () => {
  const payload = await verifyHeaderCookie()
  if (!payload) {
    return '用户登陆失效'
  }
  if (payload.role < 3) {
    return '本页面仅管理员可访问'
  }

  const response = await getDisableRegisterStatus()
  return response
}
