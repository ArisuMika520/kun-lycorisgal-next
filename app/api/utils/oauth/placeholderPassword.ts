// OAuth 首登创建的本地用户没有自设密码：写入这个哨兵值，而非随机 argon2 哈希。
// 收益：
//   1) verifyPassword 永不匹配——split(':') 后无 hash 段，比较恒为 false，本地登录侧天然安全；
//   2) 解绑/绑定状态接口据此判定「用户尚未设置可用密码」，避免解绑后账号锁死（计划 §五·1）。
// 用户可走既有「忘记密码」邮件流程补设密码（写入真正的 salt:hash），届时即视为可用。
//
// 注意：必须不含冒号 ':'，hasUsablePassword 依赖该特征与真实哈希区分。
export const OAUTH_PLACEHOLDER_PASSWORD = '!kun-oauth-no-password'

// 判断用户是否拥有可用于本地登录的密码。
// hashPassword 产出的真实哈希形如 `<saltHex>:<hashHex>`，必含冒号；
// 哨兵值不含冒号，据此区分「已设密码」与「OAuth 占位、未设密码」。
export const hasUsablePassword = (password: string): boolean =>
  password !== OAUTH_PLACEHOLDER_PASSWORD && password.includes(':')
