// 鲲 Galgame OAuth 薄客户端（confidential / 全服务端流程）。
// 只承担 token 交换、拉用户信息、吊销三件事，统一解 {code, message, data}
// 包裹，code !== 0 抛带错误码的 KunOAuthError。
// 接入指南 §1.3（Server 地址）、§3（步骤 4/5）、§5（revoke）、§7（错误码）。
// 边界：不实现 refresh（换完即弃策略，见开发计划 §二·决策 2）。

// 鲲 OAuth API 统一响应包裹格式（接入指南 §7）
interface KunOAuthResponse<T> {
  code: number
  message: string
  data: T
}

// /oauth/token 成功返回的 data（接入指南 §3 步骤 4）
export interface KunOAuthTokenData {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

// /oauth/userinfo 成功返回的 data（接入指南 §3 步骤 5）
export interface KunOAuthUserInfo {
  sub: string // 用户 UUID，作为唯一标识
  name: string
  email: string
  picture: string
  updated_at: number
}

// 错误码 → 用户可读中文提示（接入指南 §7 表）。
// 覆盖 OAuth 登录链路会遇到的错误码，未列出的回落到通用提示。
const KUN_OAUTH_ERROR_MESSAGE: Record<number, string> = {
  10001: '鲲 Galgame 登录态缺失，请重新登录',
  10002: '鲲 Galgame 令牌无效，请重新登录',
  10003: '鲲 Galgame 登录已过期，请重新登录',
  10014: '您的鲲 Galgame 账号已被封禁，无法登录',
  15001: '鲲 OAuth 客户端无效，登录配置有误，请联系管理员',
  15002: '回调地址未在鲲 OAuth 注册，登录配置有误，请联系管理员',
  15003: '授权码已失效，请重新发起登录',
  15004: '授权校验失败（PKCE 不匹配），请重新发起登录',
  15005: '鲲 OAuth 授权类型配置有误，请联系管理员',
  15006: '请求的授权范围未被许可，请联系管理员',
  15008: '鲲 OAuth 客户端密钥无效，登录配置有误，请联系管理员',
  15009: '缺少 PKCE 校验参数，请重新发起登录'
}

const FALLBACK_ERROR_MESSAGE = '鲲 Galgame 登录失败，请稍后重试'

// 鲲 OAuth 业务错误（包裹体 code !== 0）。携带原始错误码与映射后的用户提示。
export class KunOAuthError extends Error {
  // 鲲 OAuth 返回的业务错误码（非 HTTP 状态码，非零）
  readonly code: number
  // 错误码映射出的用户可读中文提示
  readonly userMessage: string

  constructor(code: number, message: string) {
    super(message)
    this.name = 'KunOAuthError'
    this.code = code
    this.userMessage = KUN_OAUTH_ERROR_MESSAGE[code] ?? FALLBACK_ERROR_MESSAGE
  }
}

// 去掉结尾斜杠，避免与端点路径拼出双斜杠
const getServerUrl = (): string =>
  process.env.KUN_OAUTH_SERVER_URL!.replace(/\/+$/, '')

// 统一解包：以包裹体里的 code 判定成败（鲲 OAuth 业务错误也可能带非 2xx HTTP 状态）
const unwrap = async <T>(response: Response): Promise<T> => {
  let result: KunOAuthResponse<T>
  try {
    result = (await response.json()) as KunOAuthResponse<T>
  } catch {
    // 非 JSON 响应（网关 5xx / 代理错误页等），无包裹体可解
    throw new KunOAuthError(
      response.status,
      `鲲 OAuth 响应解析失败 (HTTP ${response.status})`
    )
  }

  if (result.code !== 0) {
    throw new KunOAuthError(result.code, result.message)
  }

  return result.data
}

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

  return unwrap<KunOAuthTokenData>(response)
}

// 用 access_token 拉取用户信息（接入指南 §3 步骤 5）
export const getUserInfo = async (
  accessToken: string
): Promise<KunOAuthUserInfo> => {
  const response = await fetch(`${getServerUrl()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  return unwrap<KunOAuthUserInfo>(response)
}

// 吊销 refresh_token（换完即弃策略，接入指南 §5）。
// 遵循 RFC 7009，服务端无论 token 是否有效都返回 200；
// 调用方可对网络异常做 best-effort 吞错处理。
export const revoke = async (token: string): Promise<void> => {
  const response = await fetch(`${getServerUrl()}/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })

  await unwrap<unknown>(response)
}
