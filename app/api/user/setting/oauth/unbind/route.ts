import { prisma } from '~/prisma/index'
import { NextRequest, NextResponse } from 'next/server'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { hasUsablePassword } from '~/app/api/utils/oauth/placeholderPassword'

// 解绑鲲 OAuth 账号（POST，C6）。返回字符串即错误（与 setting/password 同款约定，
// 前端 kunErrorHandler 直接 toast）；成功返回空对象。
// 关键防护：解绑前校验用户已设置可用本地密码，否则解绑后将无任何登录方式 → 锁死（计划 §五·1）。
const PROVIDER = 'kun-oauth'

const unbind = async (req: NextRequest) => {
  const payload = await verifyHeaderCookie(req)
  if (!payload?.uid) {
    return '用户未登录'
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { password: true }
  })
  if (!user) {
    return '用户不存在'
  }

  // 防锁死：未设可用密码（OAuth 占位哨兵）时拒绝解绑，引导先去设密码。
  if (!hasUsablePassword(user.password)) {
    return '您还未设置登录密码，解绑后将无法登录。请先通过「忘记密码」设置密码后再解绑'
  }

  const account = await prisma.user_oauth_account.findFirst({
    where: { provider: PROVIDER, user_id: payload.uid }
  })
  if (!account) {
    return '您尚未绑定鲲 Galgame 账号'
  }

  await prisma.user_oauth_account.deleteMany({
    where: { provider: PROVIDER, user_id: payload.uid }
  })
}

export const POST = async (req: NextRequest) => {
  const res = await unbind(req)
  if (typeof res === 'string') {
    return NextResponse.json(res)
  }
  return NextResponse.json({})
}
