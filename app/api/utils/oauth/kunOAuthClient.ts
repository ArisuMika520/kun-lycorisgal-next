// 鲲 Galgame OAuth 薄客户端（confidential / 全服务端流程）。
// 只承担 token 交换、拉用户信息、吊销三件事。
// 接入指南 §1.3（Server 地址）、§3（步骤 4/5）、§5（revoke）、§7（错误码）。
// 边界：不实现 refresh（换完即弃策略，见开发计划 §二·决策 2）。
//
// ───────── 线格式：双格式兼容读取（迁移指南 §3） ─────────
// 三个协议端点（/oauth/token、/oauth/userinfo、/oauth/revoke）的响应正在从自家
// {code, message, data} 信封切换到 RFC 6749 / 6750 标准裸 JSON。切换尚未发生，
// 故此处按迁移指南 §3 实现「双格式兼容读取器」：切换前后都能正确解析。
//
// 判别只有一条 —— 看响应里有没有 `code` 这个 key：
//   有 code → 旧信封，payload 在 data 里，code !== 0 即失败
//   无 code → 标准格式，整个 body 就是 payload，失败时带 error / error_description
//
// 两种格式的失败都归一到 KunOAuthReason，调用方只认 reason、不再认数字错误码。
// 这样迁移第 3 步（切换完成后）只需删掉标注 LEGACY 的分支与 LEGACY_CODE_REASON 表，
// 调用方一行都不用改。

// /oauth/token 成功返回（迁移指南 §2.1：切换后这些字段从 data 原样提到顶层，
// 字段名和含义完全不变）
export interface KunOAuthTokenData {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
  // 切换后 OIDC 客户端可拿到 id_token（含 refresh 时，OIDC Core §12.2）；本站不消费。
  id_token?: string
}

// /oauth/userinfo 成功返回（迁移指南 §2.3）。
// updated_at 在标准格式的响应示例中未出现，声明为可选以免类型说谎；本站只用
// sub / name / email / picture 四个字段。
export interface KunOAuthUserInfo {
  sub: string // 用户 UUID，作为唯一标识
  name: string
  email: string
  picture: string
  updated_at?: number
}

// 归一化后的失败原因：旧信封的数字 code 与标准格式的 error 字符串都映射到这里。
export type KunOAuthReason =
  | 'banned' // 账号被封禁（终态，再登无用）
  | 'invalid_client' // client_id / secret 配置错
  | 'invalid_grant' // 授权码或 refresh token 失效 → 重新发起登录
  | 'invalid_request' // 请求格式问题
  | 'invalid_scope' // scope 不在允许范围
  | 'invalid_token' // access token 失效（RFC 6750）→ 凭据已死，不可重试
  | 'server_error' // 鲲 OAuth 内部故障（5xx）→ 瞬态
  | 'unauthorized_client' // 该 client 未开启此 grant
  | 'unsupported_grant_type' // 请求写错了
  | 'unknown' // 未识别 → 按瞬态处理

// 瞬态判定（迁移指南 §4·2）：**只有**未知错误和 5xx 算瞬态，其余一律是对凭据的判决。
// 注意 invalid_token 必须落在非瞬态一侧（§4·1），否则会抱着永久失效的 token 无限重试。
const TRANSIENT_REASONS: ReadonlySet<KunOAuthReason> = new Set<KunOAuthReason>([
  'server_error',
  'unknown'
])

// LEGACY: 旧信封数字错误码 → 归一 reason。切换完成后整表可删。
// 映射依据迁移指南 §2.2 的「error ← 原错误码」对照表，外加接入指南 §7 的 10001/10002。
const LEGACY_CODE_REASON: Record<number, KunOAuthReason> = {
  10001: 'invalid_token', // 未授权（缺 Bearer Token）
  10002: 'invalid_token', // 无效的令牌
  10003: 'invalid_grant', // 令牌已过期
  10014: 'banned', // 账号已封禁
  15001: 'invalid_client', // 无效的客户端
  15002: 'invalid_grant', // 无效的回调地址
  15003: 'invalid_grant', // 无效的授权码
  15004: 'invalid_grant', // 无效的代码验证器（PKCE）
  15005: 'unauthorized_client', // 无效的授权类型
  15006: 'invalid_scope', // 无效的 scope
  15008: 'invalid_client', // 无效的 client secret
  15009: 'invalid_request', // 需要 PKCE
  15011: 'unsupported_grant_type' // 不支持的 grant_type
}

// 标准格式 error 字符串 → 归一 reason（RFC 6749 §5.2、RFC 6750 §3）。
const STANDARD_ERROR_REASON: Record<string, KunOAuthReason> = {
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

// reason → 用户可读中文提示。
const REASON_MESSAGE: Record<KunOAuthReason, string> = {
  banned: '您的鲲 Galgame 账号已被封禁，无法登录',
  invalid_client: '鲲 OAuth 客户端凭据无效，登录配置有误，请联系管理员',
  invalid_grant: '授权已失效，请重新发起鲲 Galgame 账号登录',
  invalid_request: '鲲 OAuth 请求参数有误，请重新发起登录',
  invalid_scope: '请求的授权范围未被许可，请联系管理员',
  invalid_token: '鲲 Galgame 令牌无效或已过期，请重新登录',
  server_error: '鲲 Galgame 登录服务暂时异常，请稍后重试',
  unauthorized_client: '鲲 OAuth 授权类型配置有误，请联系管理员',
  unsupported_grant_type: '鲲 OAuth 授权类型不受支持，请联系管理员',
  unknown: '鲲 Galgame 登录失败，请稍后重试'
}

// 鲲 OAuth 调用失败。携带归一 reason、HTTP 状态码与映射后的用户提示。
export class KunOAuthError extends Error {
  // 归一化失败原因，跨新旧两种线格式一致。调用方应只按它分支。
  readonly reason: KunOAuthReason
  // 响应的 HTTP 状态码。区分「我们抖了」(5xx) 与「对凭据的判决」(4xx) 的唯一依据（§4·3）。
  readonly status: number
  // LEGACY: 旧信封里的数字错误码，仅用于日志排查；标准格式下恒为 null。
  readonly legacyCode: number | null
  // 是否瞬态（只有未知错误与 5xx）。非瞬态即凭据已死，重试无意义。
  readonly transient: boolean
  // reason 映射出的用户可读中文提示
  readonly userMessage: string

  constructor(
    reason: KunOAuthReason,
    status: number,
    legacyCode: number | null,
    message: string
  ) {
    super(message)
    this.name = 'KunOAuthError'
    this.reason = reason
    this.status = status
    this.legacyCode = legacyCode
    this.transient = TRANSIENT_REASONS.has(reason)
    this.userMessage = REASON_MESSAGE[reason]
  }
}

// 归一失败原因：入参取自**已解析成功的 OAuth JSON body**。
// legacyCode / standardError 至多一个非空；两个都空表示 body 里没有可用的错误标识，
// 只能退回按 HTTP 状态码判。
const classifyBody = (
  status: number,
  legacyCode: number | null,
  standardError: string | null
): KunOAuthReason => {
  // 封禁优先：RFC 6750 没有表示「账号被封」的错误码，服务端改用 HTTP 403 表达
  //（迁移指南 §2.3 的警告）。旧信封的 10014 同样是 403，两条路都落在这里。
  // 必须按 403 判定，否则会退化成「重新登录 → 又被拒」的死循环。
  //
  // 唯一例外：RFC 6750 §3.1 规定 insufficient_scope 也用 403。那是 scope 没给够，
  // 不是账号被封 —— 不排除掉会把一次 scope 配置错误告知用户为「您的账号已被封禁」。
  if (status === 403 && standardError !== 'insufficient_scope') {
    return 'banned'
  }
  if (legacyCode !== null) {
    return LEGACY_CODE_REASON[legacyCode] ?? 'unknown'
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

// 归一传输层失败（body 不是 JSON / 是空的）：这类响应多半来自网关或代理，
// 不能当作鲲 OAuth 的业务判决 —— 尤其不能把代理的 403 误判成「账号封禁」。
// 一律按瞬态处理：5xx 明确是服务端故障，其余归 unknown（同样瞬态）。
const classifyTransport = (status: number): KunOAuthReason =>
  status >= 500 ? 'server_error' : 'unknown'

// 双格式兼容读取器（迁移指南 §3）：切换前后都正确。纯函数，可直接单元自测。
// 迁移第 3 步（切换完成后）删掉标注 LEGACY 的整段即可。
export const readOAuthBody = <T>(body: unknown, status: number): T => {
  if (body === null || typeof body !== 'object') {
    throw new KunOAuthError(
      classifyTransport(status),
      status,
      null,
      `鲲 OAuth 返回了非 JSON 响应 (HTTP ${status})`
    )
  }
  const obj = body as Record<string, unknown>

  // LEGACY: `code` 存在 ⇒ 旧信封，payload 在 data 里。
  // 旧信封的业务错误也可能带非 2xx HTTP 状态，故以 code 而非 status 判定成败。
  if (typeof obj.code === 'number') {
    if (obj.code !== 0) {
      const message =
        typeof obj.message === 'string' && obj.message
          ? obj.message
          : `鲲 OAuth 错误 ${obj.code}`
      throw new KunOAuthError(
        classifyBody(status, obj.code, null),
        status,
        obj.code,
        message
      )
    }
    return obj.data as T
  }

  // 标准格式失败：RFC 6749 §5.2 / RFC 6750 §3 的 { error, error_description }。
  if (typeof obj.error === 'string') {
    const description =
      typeof obj.error_description === 'string' && obj.error_description
        ? obj.error_description
        : obj.error
    throw new KunOAuthError(
      classifyBody(status, null, obj.error),
      status,
      null,
      `${obj.error}: ${description}`
    )
  }

  // 标准格式下的非 2xx，但 body 里没有 error 字段：只能按状态码判。
  if (status >= 400) {
    throw new KunOAuthError(
      classifyBody(status, null, null),
      status,
      null,
      `鲲 OAuth 返回 HTTP ${status}`
    )
  }

  // 标准格式成功：整个 body 就是 payload。
  return obj as T
}

// 读取并解包一个 OAuth 响应。除双格式外还要处理空 body ——
// /oauth/revoke 在标准格式下是 200 且 body 为空（RFC 7009 §2.2），
// 无条件 response.json() 会抛异常（迁移指南 §2.4）。
export const readOAuthResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text()

  if (text.trim() === '') {
    if (response.ok) {
      return undefined as T
    }
    throw new KunOAuthError(
      classifyTransport(response.status),
      response.status,
      null,
      `鲲 OAuth 返回空 body (HTTP ${response.status})`
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // 非 JSON 响应（网关 5xx / 代理错误页等），无 OAuth 语义可解。
    throw new KunOAuthError(
      classifyTransport(response.status),
      response.status,
      null,
      `鲲 OAuth 响应解析失败 (HTTP ${response.status})`
    )
  }

  return readOAuthBody<T>(parsed, response.status)
}

// 去掉结尾斜杠，避免与端点路径拼出双斜杠
const getServerUrl = (): string =>
  process.env.KUN_OAUTH_SERVER_URL!.replace(/\/+$/, '')

// 用授权码换取 token（服务端执行，带 client_secret + PKCE code_verifier）
// 接入指南 §3 步骤 4
export const exchangeCode = async (
  code: string,
  codeVerifier: string
): Promise<KunOAuthTokenData> => {
  const response = await fetch(`${getServerUrl()}/oauth/token`, {
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

  return readOAuthResponse<KunOAuthTokenData>(response)
}

// 用 access_token 拉取用户信息（接入指南 §3 步骤 5）
export const getUserInfo = async (
  accessToken: string
): Promise<KunOAuthUserInfo> => {
  const response = await fetch(`${getServerUrl()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  return readOAuthResponse<KunOAuthUserInfo>(response)
}

// 吊销 refresh_token（换完即弃策略，接入指南 §5）。
// 遵循 RFC 7009，服务端无论 token 是否有效都返回 200；切换后 body 为空
// （迁移指南 §2.4），由 readOAuthResponse 的空 body 分支处理。
// 调用方可对网络异常做 best-effort 吞错处理。
export const revoke = async (token: string): Promise<void> => {
  const response = await fetch(`${getServerUrl()}/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })

  await readOAuthResponse<void>(response)
}
