import { prisma } from '~/prisma/index'
import { NextRequest, NextResponse } from 'next/server'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { hasUsablePassword } from '~/app/api/utils/oauth/placeholderPassword'

// 鲲 OAuth 账号绑定状态（GET，C6）。供设置页展示「已绑定/未绑定」与是否允许解绑。
// 永远返回对象（未登录回退为未绑定态），与 2fa/status 同款约定。
const PROVIDER = 'kun-oauth'

interface OAuthBindingStatus {
  bound: boolean
  // 已绑定时回传 KUN 端用户 UUID（sub），用于设置页展示；未绑定为 null。
  providerUserId: string | null
  // 是否已设置可用本地密码——决定解绑是否会导致账号锁死（计划 §五·1）。
  hasUsablePassword: boolean
}

export const GET = async (req: NextRequest) => {
  const payload = await verifyHeaderCookie(req)
  if (!payload?.uid) {
    const result: OAuthBindingStatus = {
      bound: false,
      providerUserId: null,
      hasUsablePassword: false
    }
    return NextResponse.json(result)
  }

  const [account, user] = await Promise.all([
    prisma.user_oauth_account.findFirst({
      where: { provider: PROVIDER, user_id: payload.uid },
      select: { provider_user_id: true }
    }),
    prisma.user.findUnique({
      where: { id: payload.uid },
      select: { password: true }
    })
  ])

  const result: OAuthBindingStatus = {
    bound: !!account,
    providerUserId: account?.provider_user_id ?? null,
    hasUsablePassword: user ? hasUsablePassword(user.password) : false
  }
  return NextResponse.json(result)
}
