// NextMoe·未萌 OAuth 薄客户端（confidential / 全服务端流程）。
// 只承担 token 交换、拉用户信息、吊销三件事。不实现 refresh。
//
// 协议端点（/oauth/token、/oauth/userinfo、/oauth/revoke）已是裸 RFC：
// 成功时整个 body 就是 payload，失败时带 error / error_description。
// 没有 {code,message,data} 信封；看到 code 也不要去读 data。
//
// 旧主机 https://oauth.kungal.com 已退役且 DNS 不存在。空配置或读到该主机时
// 回落到 KUN_OAUTH_SERVER_URL_DEFAULT；自建地址原样保留。
//
// refresh_token 是不透明随机串，不要解析、不要 jwt-decode、不要从中读 exp。
// 资料只来自 /oauth/userinfo。不要把 access token claims 当资料源。
// id_token 若出现也不验签、不假定 alg。

// /oauth/token 成功返回。refresh_token 可选且不透明。
export interface KunOAuthTokenData {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
  // 本站不消费、不验签。
  id_token?: string
}

// /oauth/userinfo。sub 必有。email / name / picture 未授权时整个键不存在，不是空字符串。
// 本站绑定键是 sub，不要把数字 id 写成本地用户主键。
export interface KunOAuthUserInfo {
  sub: string
  id?: number
  name?: string
  email?: string
  picture?: string
  roles?: string[]
  site_roles?: string[]
  adult_confirmed?: boolean
  nsfw_display?: 'hide' | 'blur' | 'show'
  updated_at?: number
}

export type KunOAuthReason =
  | 'banned' // 账号被封禁（终态，再登无用）
  | 'invalid_client' // client_id / secret 配置错（本站配置，不是读者凭据死亡）
  | 'invalid_grant' // 授权码失效 → 重新发起登录
  | 'invalid_request' // 请求格式问题，或用户拒绝（access_denied）
  | 'invalid_scope' // scope 不在允许范围（含 insufficient_scope）
  | 'invalid_token' // access token 失效（RFC 6750）→ 凭据已死，不可重试
  | 'server_error' // 服务端故障（5xx / temporarily_unavailable）→ 瞬态
  | 'unauthorized_client' // 该 client 未开启此 grant（本站配置）
  | 'unsupported_grant_type' // 请求写错了
  | 'unknown' // 未识别 → 按瞬态处理

// 只有未知错误和 5xx 算瞬态。invalid_token 必须落在非瞬态一侧。
const TRANSIENT_REASONS: ReadonlySet<KunOAuthReason> = new Set<KunOAuthReason>([
  'server_error',
  'unknown'
])

const STANDARD_ERROR_REASON: Record<string, KunOAuthReason> = {
  access_denied: 'invalid_request',
  invalid_client: 'invalid_client',
  invalid_grant: 'invalid_grant',
  invalid_request: 'invalid_request',
  invalid_scope: 'invalid_scope',
  invalid_token: 'invalid_token',
  insufficient_scope: 'invalid_scope',
  server_error: 'server_error',
  temporarily_unavailable: 'server_error',
  unauthorized_client: 'unauthorized_client',
  unsupported_grant_type: 'unsupported_grant_type'
}

const REASON_MESSAGE: Record<KunOAuthReason, string> = {
  banned: '您的 NextMoe·未萌 账号已被封禁，无法登录',
  invalid_client:
    'NextMoe·未萌 OAuth 客户端凭据无效，登录配置有误，请联系管理员',
  invalid_grant: '授权已失效，请重新发起 NextMoe·未萌 账号登录',
  invalid_request: 'NextMoe·未萌 OAuth 请求被拒绝或参数有误，请重新发起登录',
  invalid_scope: '请求的授权范围未被许可，请联系管理员',
  invalid_token: 'NextMoe·未萌 令牌无效或已过期，请重新登录',
  server_error: 'NextMoe·未萌 登录服务暂时异常，请稍后重试',
  unauthorized_client: 'NextMoe·未萌 OAuth 授权类型配置有误，请联系管理员',
  unsupported_grant_type: 'NextMoe·未萌 OAuth 授权类型不受支持，请联系管理员',
  unknown: 'NextMoe·未萌 登录失败，请稍后重试'
}

export class KunOAuthError extends Error {
  readonly reason: KunOAuthReason
  readonly status: number
  readonly transient: boolean
  readonly userMessage: string

  constructor(reason: KunOAuthReason, status: number, message: string) {
    super(message)
    this.name = 'KunOAuthError'
    this.reason = reason
    this.status = status
    this.transient = TRANSIENT_REASONS.has(reason)
    this.userMessage = REASON_MESSAGE[reason]
  }
}

// 已解析的 OAuth JSON。字符串 error 优先映射；没有 error 时只按状态码兜底。
// HTTP 403 且 error 不是 insufficient_scope → banned。insufficient_scope → invalid_scope。
const classifyBody = (
  status: number,
  standardError: string | null
): KunOAuthReason => {
  if (status === 403 && standardError !== 'insufficient_scope') {
    return 'banned'
  }
  if (standardError !== null) {
    return STANDARD_ERROR_REASON[standardError] ?? 'unknown'
  }
  if (status >= 500) {
    return 'server_error'
  }
  if (status === 401) {
    return 'invalid_token'
  }
  return 'unknown'
}

// 非 JSON / 空 body 的非 2xx 来自网关或代理，没有 OAuth 语义。
// 5xx = server_error，其余 = unknown，都是瞬态。禁止把网关 403 判成 banned。
const classifyTransport = (status: number): KunOAuthReason =>
  status >= 500 ? 'server_error' : 'unknown'

export const readOAuthBody = <T>(body: unknown, status: number): T => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new KunOAuthError(
      classifyTransport(status),
      status,
      `NextMoe·未萌 OAuth 返回了非 JSON 响应 (HTTP ${status})`
    )
  }
  const record = body as Record<string, unknown>

  if (typeof record.error === 'string') {
    const description =
      typeof record.error_description === 'string' && record.error_description
        ? record.error_description
        : record.error
    throw new KunOAuthError(
      classifyBody(status, record.error),
      status,
      `${record.error}: ${description}`
    )
  }

  if (status >= 400) {
    throw new KunOAuthError(
      classifyBody(status, null),
      status,
      `NextMoe·未萌 OAuth 返回 HTTP ${status}`
    )
  }

  return record as T
}

// 空 body 且 response.ok：revoke 成功（RFC 7009 §2.2），返回 undefined。
// 空 body / 非 JSON 的非 2xx 走传输层分类，不能当成封禁。
export const readOAuthResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text()

  if (text.trim() === '') {
    if (response.ok) {
      return undefined as T
    }
    throw new KunOAuthError(
      classifyTransport(response.status),
      response.status,
      `NextMoe·未萌 OAuth 返回空 body (HTTP ${response.status})`
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // 线上 /oauth/revoke 成功是 200 text/plain "OK"，不是空 body，也不是 JSON。
    // 2xx 且不是 JSON：没有 payload，按成功处理。4xx/5xx 仍是传输层故障。
    if (response.ok) {
      return undefined as T
    }
    throw new KunOAuthError(
      classifyTransport(response.status),
      response.status,
      `NextMoe·未萌 OAuth 响应解析失败 (HTTP ${response.status})`
    )
  }

  return readOAuthBody<T>(parsed, response.status)
}

export const KUN_OAUTH_SERVER_URL_DEFAULT = 'https://account.nextmoe.com/api/v1'

const RETIRED_OAUTH_ORIGIN = 'https://oauth.kungal.com'

export const kunOAuthServerUrl = (): string => {
  const configured = (process.env.KUN_OAUTH_SERVER_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
  if (
    configured === '' ||
    configured === RETIRED_OAUTH_ORIGIN ||
    configured.startsWith(`${RETIRED_OAUTH_ORIGIN}/`)
  ) {
    return KUN_OAUTH_SERVER_URL_DEFAULT
  }
  return configured
}

export const KUN_OAUTH_WEB_URL_DEFAULT = 'https://account.nextmoe.com'

const LOCAL_OAUTH_API_ORIGIN = 'http://127.0.0.1:9277'
const LOCAL_OAUTH_WEB_URL = 'http://127.0.0.1:9420'

// 注册页在 Web 源，不在 API base。/api/v1/auth/register 是要登录的 JSON API，
// 浏览器跳过去只会拿到 401。生产 Web 源是 account.nextmoe.com；文档里的自建
// API :9277 对应 Web :9420。其它 API 地址去掉 /api/v1。KUN_OAUTH_WEB_URL 可覆盖。
export const kunOAuthWebUrl = (): string => {
  const configured = (process.env.KUN_OAUTH_WEB_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
  if (configured !== '') {
    return configured
  }
  const api = kunOAuthServerUrl()
  if (
    api === `${LOCAL_OAUTH_API_ORIGIN}/api/v1` ||
    api.startsWith(`${LOCAL_OAUTH_API_ORIGIN}/`)
  ) {
    return LOCAL_OAUTH_WEB_URL
  }
  return api.replace(/\/api\/v1$/, '')
}

export const exchangeCode = async (
  code: string,
  codeVerifier: string
): Promise<KunOAuthTokenData> => {
  const response = await fetch(`${kunOAuthServerUrl()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.KUN_OAUTH_REDIRECT_URI!,
      client_id: process.env.KUN_OAUTH_CLIENT_ID!,
      client_secret: process.env.KUN_OAUTH_CLIENT_SECRET!,
      code_verifier: codeVerifier
    })
  })

  const data = await readOAuthResponse<KunOAuthTokenData>(response)
  if (
    typeof data?.access_token !== 'string' ||
    data.access_token.length === 0
  ) {
    throw new KunOAuthError(
      'invalid_grant',
      response.status,
      'NextMoe·未萌 OAuth 未返回 access_token'
    )
  }
  return data
}

export const getUserInfo = async (
  accessToken: string
): Promise<KunOAuthUserInfo> => {
  const response = await fetch(`${kunOAuthServerUrl()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  const info = await readOAuthResponse<KunOAuthUserInfo>(response)
  if (typeof info?.sub !== 'string' || info.sub.length === 0) {
    throw new KunOAuthError(
      'invalid_token',
      response.status,
      'NextMoe·未萌 OAuth 未返回 sub'
    )
  }
  return info
}

export const revoke = async (token: string): Promise<void> => {
  const response = await fetch(`${kunOAuthServerUrl()}/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })

  await readOAuthResponse<void>(response)
}
