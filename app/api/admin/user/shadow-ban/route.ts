import { NextRequest, NextResponse } from 'next/server'
import { kunParsePutBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { adminShadowBanUserSchema } from '~/validations/admin'
import { updateUserShadowBan } from './update'

/**
 * PUT /api/admin/user/shadow-ban：开启（enabled: true）或解除 shadow ban。
 * 新式错误返回：真实 HTTP 状态码 + { error }。
 */
export const PUT = async (req: NextRequest) => {
  const input = await kunParsePutBody(req, adminShadowBanUserSchema)
  if (typeof input === 'string') {
    return NextResponse.json({ error: input }, { status: 400 })
  }
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 })
  }
  if (payload.role < 3) {
    return NextResponse.json({ error: '本操作仅管理员可用' }, { status: 403 })
  }

  const result = await updateUserShadowBan(input, payload.uid)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.httpStatus }
    )
  }
  return NextResponse.json({ enabled: result.enabled })
}
