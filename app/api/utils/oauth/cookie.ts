// 鲲 OAuth 登录发起(login route)与回调(callback route)共享的临时 cookie 名。
// 单独成文件、不从 route.ts 导出：Next.js 的 route 类型校验器只接受 route
// 文件导出约定内的 handler（GET/POST...），导出其它符号会污染 .next/types 校验。
// 把两处共用的常量收敛到这里，避免 login/callback 两边硬编码字符串漂移。

// 跨重定向校验用的临时 cookie（state 防 CSRF / PKCE code_verifier）。
// 由 login route 写入（10 分钟、httpOnly、sameSite=lax），callback route 读取后清除。
export const KUN_OAUTH_STATE_COOKIE = 'kun-oauth-state'
export const KUN_OAUTH_VERIFIER_COOKIE = 'kun-oauth-verifier'

// 绑定模式标记（C6）：login route 在 ?action=bind 且已登录时写入「发起绑定的 uid」，
// callback route 据此走绑定分支（为该 uid 写 user_oauth_account），而非登录/建号分支。
// 与上面两个临时 cookie 同生命周期（10 分钟、httpOnly、sameSite=lax），callback 读取后清除。
// 值为服务端从已验证会话取出的 uid，浏览器无法伪造他人 uid（只能是自己的当前会话）。
export const KUN_OAUTH_BIND_COOKIE = 'kun-oauth-bind'
