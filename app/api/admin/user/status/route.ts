import { NextRequest, NextResponse } from 'next/server'
import { kunParsePutBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { adminUpdateUserStatusSchema } from '~/validations/admin'
import { updateUserStatus } from './update'

/**
 * PUT /api/admin/user/status：管理员快捷封禁 / 解封用户。
 * 新接口，使用“真实 HTTP 状态码 + { error }”的新式错误返回。
 */
export const PUT = async (req: NextRequest) => {
  const input = await kunParsePutBody(req, adminUpdateUserStatusSchema)
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

  const result = await updateUserStatus(input, payload.uid)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.httpStatus }
    )
  }
  return NextResponse.json({ status: result.status })
}
