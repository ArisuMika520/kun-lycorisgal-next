import { NextRequest, NextResponse } from 'next/server'
import { kunParsePutBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { adminUserIdSchema } from '~/validations/admin'
import { restoreUser } from './restore'

/**
 * PUT /api/admin/user/restore：恢复被伪删除的用户（仅超级管理员）。
 * 新式错误返回：真实 HTTP 状态码 + { error }。
 */
export const PUT = async (req: NextRequest) => {
  const input = await kunParsePutBody(req, adminUserIdSchema)
  if (typeof input === 'string') {
    return NextResponse.json({ error: input }, { status: 400 })
  }
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 })
  }
  if (payload.role < 4) {
    return NextResponse.json(
      { error: '本操作仅超级管理员可用' },
      { status: 403 }
    )
  }

  const result = await restoreUser(input, payload.uid)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.httpStatus }
    )
  }
  return NextResponse.json({})
}
