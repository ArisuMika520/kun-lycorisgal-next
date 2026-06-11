import crypto from 'crypto'

// RFC 7636 PKCE 参数生成（服务端版）。
// 接入指南 §3 步骤 1 给的是浏览器实现（crypto.getRandomValues /
// crypto.subtle.digest / btoa），这里改写为 Node crypto，
// base64url 输出无填充（Buffer 的 'base64url' 编码本身即 RFC 4648 §5 且省略 '='）。

// 生成 code_verifier：32 字节随机数 → base64url 无填充
// （约 43 字符，落在 RFC 7636 要求的 43-128 区间内）
export const generateCodeVerifier = (): string =>
  crypto.randomBytes(32).toString('base64url')

// 根据 verifier 生成 code_challenge（S256）：
// BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))，无填充
export const generateCodeChallenge = (verifier: string): string =>
  crypto.createHash('sha256').update(verifier).digest('base64url')

// 生成 state（防 CSRF）：16 字节随机数的 hex 串
export const generateState = (): string =>
  crypto.randomBytes(16).toString('hex')
