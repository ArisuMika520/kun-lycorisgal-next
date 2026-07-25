import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '~/prisma/index'
import { generateKunToken } from '~/app/api/utils/jwt'
import { getRemoteIp } from '~/app/api/utils/getRemoteIp'
import {
  exchangeCode,
  getUserInfo,
  revoke,
  KunOAuthError
} from '~/app/api/utils/oauth/kunOAuthClient'
import type { KunOAuthUserInfo } from '~/app/api/utils/oauth/kunOAuthClient'
import {
  KUN_OAUTH_STATE_COOKIE,
  KUN_OAUTH_VERIFIER_COOKIE,
  KUN_OAUTH_BIND_COOKIE
} from '~/app/api/utils/oauth/cookie'
import { OAUTH_PLACEHOLDER_PASSWORD } from '~/app/api/utils/oauth/placeholderPassword'

// 鲲 OAuth 回调路由（GET）。严格按开发计划 §四·阶段 2 的 8 步实现：
// state 校验 → 换 token → userinfo → 按 (provider,sub) 查绑定决定登录/创建/拒绝
// → 本地封禁拦截 → 签发本站 JWT 设会话 cookie → revoke 即弃 → 回首页。
// 边界：不实现 refresh/单飞锁（换完即弃，计划 §二·决策 2）。
//
// ───────── 绑定模式（C6，计划 §五·1） ─────────
// 当存在 KUN_OAUTH_BIND_COOKIE（由 login route ?action=bind 在已登录时写入 uid）时，
// 走绑定分支而非登录/建号分支：state 校验后换 token + userinfo，再按 sub 处理——
//   sub 已绑到他人 → /settings/user?oauth=bind_conflict
//   sub 已绑到本人 → /settings/user?oauth=bind_already
//   当前账号已绑过别的 KUN 账号 → /settings/user?oauth=bind_exists
//   未绑定 → 为该 uid 写 user_oauth_account → /settings/user?oauth=bind_success
//   任何失败（state/换 token/封号等） → /settings/user?oauth=bind_failed
// 绑定不签发新会话（用户本就已登录），但同样 revoke 即弃。
//
// ───────── callback 错误参数约定（供 C4 UI 消费） ─────────
// 失败统一以查询参数 `error=<code>` 回跳，按可重试性分两类落点：
//   可重试 / 可处置 → /login?error=<code>
//     • invalid_state      state 缺失或与临时 cookie 不一致（CSRF / cookie 丢失），重新发起即可
//     • oauth_failed       通用失败：用户拒绝授权 / 缺 code / 配置类（invalid_client /
//                          invalid_scope / unauthorized_client / invalid_request）/ 令牌失效
//     • expired            授权失效（reason=invalid_grant：授权码过期或已用、PKCE 不匹配、
//                          回调地址不匹配），引导用户重新发起登录
//     • oauth_unavailable  瞬态失败（reason 瞬态：5xx / 未知错误 / 网络 / 网关），稍后重试
//     • email_exists       KUN 邮箱已被本地账号占用，不静默合并；提示先本地登录再绑定（二期）
//   终态 / 再登无用 → /?error=banned（刻意不落 /login，指南 §7：封号再登无意义）
//     • banned             本地 status===2 封禁，或 KUN 端封号（reason=banned）
// C4 在 login 页消费前五类（toast），并对 banned 在落地页给终态提示。
//
// 注：分支只认 KunOAuthError.reason（跨新旧线格式归一），不认数字错误码 ——
// 线格式切换后（迁移指南 §3 第 2 步）此处无需任何改动。

const PROVIDER = 'kun-oauth'

// 本站会话 cookie：必须与本地 login/register 完全一致（中间件按此名解 JWT）。
const SESSION_COOKIE = 'kun-galgame-patch-moe-token'

// 反向代理下用转发头还原对外 origin，回退到 req.nextUrl.origin（对齐 middleware/auth.ts）。
const getBaseUrl = (req: NextRequest): string => {
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const protocol = forwardedProto
    ? forwardedProto.split(',')[0].trim()
    : req.nextUrl.protocol.replace(':', '')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  return host ? `${protocol}://${host}` : req.nextUrl.origin
}

// 统一构造「清掉临时 cookie 的重定向」。成功/失败所有分支都经它收口，
// 确保单次性的 state / verifier / bind 临时 cookie 一定被清除（防重放）。
const redirectWithCleanup = (req: NextRequest, path: string): NextResponse => {
  const response = NextResponse.redirect(new URL(path, getBaseUrl(req)))
  const expire = { path: '/', maxAge: 0 }
  response.cookies.set(KUN_OAUTH_STATE_COOKIE, '', expire)
  response.cookies.set(KUN_OAUTH_VERIFIER_COOKIE, '', expire)
  response.cookies.set(KUN_OAUTH_BIND_COOKIE, '', expire)
  return response
}

// 截断到 17 字符（user.name 是 @unique varchar(17)）。trim 后空名回退 'kun'。
const truncateName = (raw: string): string => {
  const trimmed = (raw ?? '').trim().slice(0, 17)
  return trimmed || 'kun'
}

// 建号时生成唯一用户名：截断 17，冲突加随机后缀，整体仍 ≤17（计划 §三）。
const buildUniqueName = async (raw: string): Promise<string> => {
  const base = truncateName(raw)
  let candidate = base
  for (let i = 0; i < 6; i++) {
    const taken = await prisma.user.findFirst({
      where: { name: { equals: candidate, mode: 'insensitive' } }
    })
    if (!taken) {
      return candidate
    }
    const suffix = crypto.randomBytes(2).toString('hex') // 4 个 hex 字符
    candidate = `${base.slice(0, 17 - suffix.length - 1)}-${suffix}`
  }
  // 极端兜底（连撞 6 次，几乎不可能）：纯随机名。
  return `kun-${crypto.randomBytes(6).toString('hex')}`.slice(0, 17)
}

// 按 (provider, sub) 查绑定，返回本地用户；命中→同步 name/avatar，未命中→建号+绑定，
// 邮箱冲突→返回错误重定向路径（字符串）。对应计划 §四·阶段 2 第 4 步三分支。
const resolveLocalUser = async (
  req: NextRequest,
  userInfo: KunOAuthUserInfo
) => {
  const account = await prisma.user_oauth_account.findUnique({
    where: {
      provider_provider_user_id: {
        provider: PROVIDER,
        provider_user_id: userInfo.sub
      }
    },
    include: { user: true }
  })

  const picture = userInfo.picture?.trim()
  // avatar 是 varchar(233)，超长 URL 会触发约束错误 → 超长则不写。
  const avatar = picture && picture.length <= 233 ? picture : undefined
  const desiredName = truncateName(userInfo.name)

  // —— 命中绑定：同步最新 name/avatar 后登录 ——
  if (account) {
    const data: { avatar?: string; name?: string } = {}
    if (avatar !== undefined) {
      data.avatar = avatar
    }
    // 仅当新名空闲（或就是自己）才同步，避免撞他人 @unique 触发 500。
    if (desiredName.toLowerCase() !== account.user.name.toLowerCase()) {
      const taken = await prisma.user.findFirst({
        where: {
          name: { equals: desiredName, mode: 'insensitive' },
          id: { not: account.user_id }
        }
      })
      if (!taken) {
        data.name = desiredName
      }
    }
    if (Object.keys(data).length === 0) {
      return account.user
    }
    return prisma.user.update({ where: { id: account.user_id }, data })
  }

  // —— 未命中：先做邮箱撞车检测 ——
  const email = userInfo.email?.trim().toLowerCase()
  if (email) {
    const emailOwner = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    })
    if (emailOwner) {
      // 不静默自动合并（防账号接管）：提示先本地登录再到设置绑定（绑定属 C6）。
      return '/login?error=email_exists'
    }
  }

  // —— 创建用户 + 绑定记录（占位密码哨兵，用户可走"忘记密码"补设可用密码） ——
  // 写哨兵而非随机哈希：解绑接口据此判定「未设密码」以防锁死（计划 §五·1、见 placeholderPassword）。
  const name = await buildUniqueName(userInfo.name)
  // 邮箱缺失时合成唯一占位，规避 user.email 的 NOT NULL/@unique 约束。
  const resolvedEmail = email || `kun-${userInfo.sub}@oauth.kungal.local`

  return prisma.user.create({
    data: {
      name,
      email: resolvedEmail,
      password: OAUTH_PLACEHOLDER_PASSWORD,
      ip: getRemoteIp(req.headers),
      avatar: avatar ?? undefined,
      oauth_account: {
        create: {
          provider: PROVIDER,
          provider_user_id: userInfo.sub
        }
      }
    }
  })
}

// 绑定模式（C6）：为已登录用户 uid 绑定 KUN 账号（sub）。返回回跳到设置页的路径，
// 由调用方经 redirectWithCleanup 收口。唯一约束 (provider, provider_user_id) 兜底防抢绑。
const bindAccount = async (
  uid: number,
  userInfo: KunOAuthUserInfo
): Promise<string> => {
  const existing = await prisma.user_oauth_account.findUnique({
    where: {
      provider_provider_user_id: {
        provider: PROVIDER,
        provider_user_id: userInfo.sub
      }
    }
  })
  if (existing) {
    // 该 KUN 账号已被某账号绑定：本人→幂等成功提示，他人→拒绝（防账号接管）。
    return existing.user_id === uid
      ? '/settings/user?oauth=bind_already'
      : '/settings/user?oauth=bind_conflict'
  }

  // 一账号一 KUN：当前用户已绑过别的 KUN 账号则不再追加（与设置页「已绑定」展示一致）。
  const userBinding = await prisma.user_oauth_account.findFirst({
    where: { provider: PROVIDER, user_id: uid }
  })
  if (userBinding) {
    return '/settings/user?oauth=bind_exists'
  }

  await prisma.user_oauth_account.create({
    data: { user_id: uid, provider: PROVIDER, provider_user_id: userInfo.sub }
  })
  return '/settings/user?oauth=bind_success'
}

export const GET = async (req: NextRequest) => {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const savedState = req.cookies.get(KUN_OAUTH_STATE_COOKIE)?.value
  const codeVerifier = req.cookies.get(KUN_OAUTH_VERIFIER_COOKIE)?.value

  // 绑定模式判定（C6）：bind cookie 存在即为「已登录用户绑定 KUN 账号」流程。
  // cookie 值是 login route 从已验证会话取出的 uid；非法/缺失则按普通登录流程。
  const bindUidRaw = req.cookies.get(KUN_OAUTH_BIND_COOKIE)?.value
  const bindUid = bindUidRaw ? Number(bindUidRaw) : NaN
  const isBind = Number.isInteger(bindUid) && bindUid > 0

  // 失败落点：绑定模式统一回设置页 bind_failed，普通登录沿用既有 /login?error=。
  const fail = (loginPath: string) =>
    redirectWithCleanup(
      req,
      isBind ? '/settings/user?oauth=bind_failed' : loginPath
    )

  // 1. 校验 state（CSRF 防护）：state/cookie/verifier 缺任一或不一致即拒。
  if (!state || !savedState || state !== savedState || !codeVerifier) {
    return fail('/login?error=invalid_state')
  }
  // OAuth 端可能带 ?error= 回跳（用户拒绝授权）或缺 code → 通用失败。
  if (!code) {
    return fail('/login?error=oauth_failed')
  }

  try {
    // 2. 服务端换 token（带 client_secret + code_verifier）。
    const token = await exchangeCode(code, codeVerifier)
    // 3. 拉用户信息 { sub, name, email, picture }。
    const userInfo = await getUserInfo(token.access_token)

    // 绑定模式：为当前登录用户写绑定记录（不签发新会话），同样 revoke 即弃。
    if (isBind) {
      const target = await bindAccount(bindUid, userInfo)
      try {
        await revoke(token.refresh_token)
      } catch {
        // RFC 7009：吊销结果不影响绑定结果，忽略。
      }
      return redirectWithCleanup(req, target)
    }

    // 4. 按 (provider, sub) 查绑定，决定登录/创建/拒绝。
    const localUser = await resolveLocalUser(req, userInfo)
    if (typeof localUser === 'string') {
      // 业务拒绝（邮箱冲突等），localUser 即错误重定向路径。
      return redirectWithCleanup(req, localUser)
    }

    // 5. 本地封禁拦截：跳错误页而非登录页（再登无用，指南 §7）。
    if (localUser.status === 2) {
      return redirectWithCleanup(req, '/?error=banned')
    }

    // 6. 复用 generateKunToken 签发本站 30 天 JWT。
    const sessionToken = await generateKunToken(
      localUser.id,
      localUser.name,
      localUser.role,
      '30d'
    )

    // 7. 吊销 refresh_token（换完即弃，best-effort，吊销失败不阻断本站登录）。
    try {
      await revoke(token.refresh_token)
    } catch {
      // RFC 7009：吊销结果不影响本站会话，忽略。
    }

    // 8. 设会话 cookie 并回首页。带 `?oauth=success` 标记，由 components/oauth/
    //    KunOAuthLanding 在落地后拉 /api/user/status 刷新前端 UserState（顶栏 User.tsx
    //    的同步以 uid>0 为前置，空 store 首登不会自动拉取，故需此标记触发）。
    //    cookie 各项与本地 login/register 保持一致（sameSite=strict、同 maxAge）。
    const response = redirectWithCleanup(req, '/?oauth=success')
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return response
  } catch (error) {
    // 绑定模式下任何失败统一回设置页 bind_failed（fail 内部据 isBind 分流）。
    if (error instanceof KunOAuthError) {
      // KUN 端封号：跳错误页而非登录页（指南 §7）。
      // 旧信封是 code=10014，标准格式是 HTTP 403（RFC 6750 无对应错误码），
      // 两者都已在 kunOAuthClient 里归一成 reason='banned'。
      if (error.reason === 'banned') {
        return fail('/?error=banned')
      }
      // 授权失效（授权码过期/已用/并发兑换输的那次、PKCE 不匹配、回调地址不匹配）：引导重试。
      if (error.reason === 'invalid_grant') {
        return fail('/login?error=expired')
      }
      // 瞬态（5xx / 未知错误 / 网关故障，迁移指南 §4·2、§4·3）：明确提示稍后重试，
      // 不要说成凭据问题 —— 这是我们抖了，不是用户的账号有问题。
      if (error.transient) {
        return fail('/login?error=oauth_unavailable')
      }
      // 其余（配置类 invalid_client/invalid_scope/unauthorized_client/invalid_request、
      // 令牌失效 invalid_token）统一归为通用失败。
      return fail('/login?error=oauth_failed')
    }
    // 非 OAuth 业务异常（fetch 网络错误、DB 等）：网络类属瞬态，但此处无法区分 DB 失败，
    // 沿用通用失败提示（同样引导重试）。
    return fail('/login?error=oauth_failed')
  }
}
