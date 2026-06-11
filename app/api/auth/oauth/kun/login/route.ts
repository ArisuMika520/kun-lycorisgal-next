import { NextRequest, NextResponse } from 'next/server'
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState
} from '~/app/api/utils/oauth/pkce'
import {
  KUN_OAUTH_STATE_COOKIE,
  KUN_OAUTH_VERIFIER_COOKIE,
  KUN_OAUTH_BIND_COOKIE
} from '~/app/api/utils/oauth/cookie'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'

// 鲲 OAuth 登录发起路由（GET，全服务端流程）。
// 生成 PKCE + state → 写 10 分钟 httpOnly 临时 cookie → 302 到鲲 OAuth 授权端点。
// ?action=register 时按指南 §2 改跳鲲 OAuth 注册页（登录的超集）。
// ?action=bind（C6）：要求已登录，额外写 bind cookie（uid），callback 据此走绑定分支。
// 实现细节回查开发计划 §四·阶段 2、§五·1、接入指南 §2/§3 步骤 1-2。

// cookie 的 maxAge 单位是「秒」。这两个临时 cookie 自身即过期凭证
//（不像会话 cookie 内含会自然过期的 JWT），必须精确 10 分钟。
const TEMP_COOKIE_MAX_AGE_SECONDS = 10 * 60

// 去掉结尾斜杠，避免与端点路径拼出双斜杠（与 kunOAuthClient 同款处理）。
const getServerUrl = (): string =>
  process.env.KUN_OAUTH_SERVER_URL!.replace(/\/+$/, '')

export const GET = async (req: NextRequest) => {
  const action = req.nextUrl.searchParams.get('action')

  // 绑定模式（C6）必须已登录：未登录则回登录页提示先登录，避免把 KUN 账号绑到匿名会话。
  let bindUid: number | undefined
  if (action === 'bind') {
    const payload = await verifyHeaderCookie(req)
    if (!payload?.uid) {
      return NextResponse.redirect(
        new URL('/login?error=bind_login_required', req.nextUrl.origin)
      )
    }
    bindUid = payload.uid
  }

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateState()

  const params = new URLSearchParams({
    client_id: process.env.KUN_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.KUN_OAUTH_REDIRECT_URI!,
    response_type: 'code',
    // 需要 email 用于本站建号/撞车检测，故请求三件套（client allowed_scopes 已含）。
    scope: 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  })
  const authorizeUrl = `${getServerUrl()}/oauth/authorize?${params.toString()}`

  // 注册是登录的超集（指南 §2）：?action=register 时改跳鲲 OAuth 注册页，
  // 把整条授权 URL 作为 redirect 串回；注册成功后 OAuth 端自动续到 /oauth/authorize，
  // 之后回调流程与登录完全一致。bind 模式不改跳，直接走授权页。
  const target =
    action === 'register'
      ? `${getServerUrl()}/auth/register?redirect=${encodeURIComponent(authorizeUrl)}`
      : authorizeUrl

  const response = NextResponse.redirect(target)

  // sameSite 必须是 'lax'：用户从鲲 OAuth 站点 302 回本站 callback 属于跨站
  // 顶层 GET 导航，'strict' 下浏览器不会带上这两个 cookie，state 永远校验不过。
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TEMP_COOKIE_MAX_AGE_SECONDS
  }
  response.cookies.set(KUN_OAUTH_STATE_COOKIE, state, cookieOptions)
  response.cookies.set(KUN_OAUTH_VERIFIER_COOKIE, codeVerifier, cookieOptions)

  // 绑定模式：把发起绑定的 uid 写入 bind cookie，callback 据此为该 uid 绑定 KUN 账号。
  if (bindUid !== undefined) {
    response.cookies.set(KUN_OAUTH_BIND_COOKIE, String(bindUid), cookieOptions)
  }

  return response
}
