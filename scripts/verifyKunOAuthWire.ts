// 鲲 OAuth 双格式兼容读取器自测（迁移指南 §5）。
// 兼容读取器是纯函数，不需要等鲲 OAuth 那边切换线格式 —— 现在就能跑：
//
//   pnpm exec esno scripts/verifyKunOAuthWire.ts
//
// 每个用例都成对给出「旧信封」与「标准格式」两组 body，两组必须解析出同一结果。
// 线格式切换后（迁移指南 §3 第 2 步）这个脚本应当**原样全绿**；如果切换当天
// 有任何红色，说明兼容分支被误删或映射漏了。

import {
  KunOAuthError,
  readOAuthBody,
  readOAuthResponse
} from '../app/api/utils/oauth/kunOAuthClient'
import type {
  KunOAuthReason,
  KunOAuthTokenData,
  KunOAuthUserInfo
} from '../app/api/utils/oauth/kunOAuthClient'

let failed = 0

const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = Object.is(actual, expected)
  if (!ok) {
    failed++
  }
  console.log(
    `${ok ? '  ok  ' : '  FAIL'} ${name}${ok ? '' : ` — 期望 ${String(expected)}，实际 ${String(actual)}`}`
  )
}

// 断言一个 body 会被判成失败，并校验归一后的 reason / transient。
const checkFailure = (
  name: string,
  body: unknown,
  status: number,
  expectedReason: KunOAuthReason,
  expectedTransient: boolean
) => {
  try {
    readOAuthBody(body, status)
    check(name, 'resolved', `throw ${expectedReason}`)
  } catch (error) {
    if (!(error instanceof KunOAuthError)) {
      check(name, 'non-KunOAuthError', `throw ${expectedReason}`)
      return
    }
    check(`${name} → reason`, error.reason, expectedReason)
    check(`${name} → transient`, error.transient, expectedTransient)
  }
}

const main = async () => {
  // ── §5：token 成功，两组都要解析出 access_token = "TOK" ──────────────────
  console.log('\n/oauth/token 成功')
  const legacyToken = {
    code: 0,
    message: '成功',
    data: {
      access_token: 'TOK',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'REF',
      scope: 'openid profile email'
    }
  }
  const standardToken = {
    access_token: 'TOK',
    token_type: 'Bearer',
    expires_in: 900,
    refresh_token: 'REF',
    scope: 'openid profile email'
  }
  check(
    '旧信封 access_token',
    readOAuthBody<KunOAuthTokenData>(legacyToken, 200).access_token,
    'TOK'
  )
  check(
    '标准格式 access_token',
    readOAuthBody<KunOAuthTokenData>(standardToken, 200).access_token,
    'TOK'
  )
  check(
    '旧信封 refresh_token',
    readOAuthBody<KunOAuthTokenData>(legacyToken, 200).refresh_token,
    'REF'
  )
  check(
    '标准格式 refresh_token',
    readOAuthBody<KunOAuthTokenData>(standardToken, 200).refresh_token,
    'REF'
  )

  // ── §5：token 失败，两组都要判成「凭据已死」(invalid_grant，非瞬态) ──────
  console.log('\n/oauth/token 失败（授权码无效）')
  checkFailure(
    '旧信封 15003',
    { code: 15003, message: '无效的授权码' },
    400,
    'invalid_grant',
    false
  )
  checkFailure(
    '标准格式 invalid_grant',
    { error: 'invalid_grant', error_description: '无效的授权码' },
    400,
    'invalid_grant',
    false
  )

  // ── §2.3 警告：封禁必须按 HTTP 403 判定，否则会「重新登录 → 又被拒」死循环 ──
  console.log('\n封禁（终态，再登无用）')
  checkFailure(
    '旧信封 10014',
    { code: 10014, message: '账号已封禁' },
    403,
    'banned',
    false
  )
  checkFailure(
    '标准格式 403（RFC 6750 无封禁错误码，只能按状态码判）',
    { error: 'invalid_token', error_description: '账号已封禁' },
    403,
    'banned',
    false
  )
  // RFC 6750 §3.1：insufficient_scope 也是 403，但那是 scope 没给够，不能报成封禁。
  checkFailure(
    '标准格式 403 insufficient_scope 不判封禁',
    { error: 'insufficient_scope', error_description: 'scope 不足' },
    403,
    'invalid_scope',
    false
  )

  // ── §4·1：invalid_token 必须是「凭据已死」，绝不能落进瞬态重试分支 ────────
  console.log('\n§4·1 invalid_token 不是瞬态')
  checkFailure(
    '旧信封 10002',
    { code: 10002, message: '无效的令牌' },
    401,
    'invalid_token',
    false
  )
  checkFailure(
    '标准格式 invalid_token',
    { error: 'invalid_token', error_description: 'token 已失效' },
    401,
    'invalid_token',
    false
  )

  // ── §4·2 / §4·3：只有未知错误和 5xx 算瞬态；server_error 是 500 不是 4xx ──
  console.log('\n§4·2 §4·3 瞬态判定')
  checkFailure(
    '标准格式 server_error（500 → 瞬态）',
    { error: 'server_error', error_description: '内部故障' },
    500,
    'server_error',
    true
  )
  checkFailure(
    '标准格式 未知 error（→ 瞬态）',
    { error: 'brand_new_error_code' },
    400,
    'unknown',
    true
  )
  checkFailure(
    '旧信封 未知 code（→ 瞬态）',
    { code: 19999, message: '？' },
    400,
    'unknown',
    true
  )
  checkFailure(
    '标准格式 invalid_client（401 → 非瞬态）',
    { error: 'invalid_client', error_description: 'client 凭据错误' },
    401,
    'invalid_client',
    false
  )
  checkFailure(
    '标准格式 unauthorized_client（→ 非瞬态）',
    { error: 'unauthorized_client' },
    400,
    'unauthorized_client',
    false
  )

  // ── userinfo：两组都要拿到 sub ──────────────────────────────────────────
  console.log('\n/oauth/userinfo 成功')
  const legacyUser = {
    code: 0,
    message: '成功',
    data: { sub: 'uuid-1', name: 'kun', email: 'kun@kungal.com', picture: '' }
  }
  const standardUser = {
    id: 1007,
    sub: 'uuid-1',
    name: 'kun',
    email: 'kun@kungal.com',
    picture: '',
    roles: ['user']
  }
  check(
    '旧信封 sub',
    readOAuthBody<KunOAuthUserInfo>(legacyUser, 200).sub,
    'uuid-1'
  )
  check(
    '标准格式 sub',
    readOAuthBody<KunOAuthUserInfo>(standardUser, 200).sub,
    'uuid-1'
  )

  // ── §2.4：revoke 切换后是 200 空 body，无条件 res.json() 会抛异常 ────────
  console.log('\n/oauth/revoke')
  await readOAuthResponse<void>(
    new Response(JSON.stringify({ code: 0, message: '成功' }), { status: 200 })
  )
  console.log('  ok   旧信封 {code:0} 不抛')
  await readOAuthResponse<void>(new Response('', { status: 200 }))
  console.log('  ok   标准格式 200 空 body 不抛（RFC 7009 §2.2）')

  // ── 传输层故障：网关的非 JSON 响应不能被当成鲲 OAuth 的业务判决 ──────────
  console.log('\n传输层故障（网关 / 代理，非 JSON）')
  const gateway502 = await readOAuthResponse(
    new Response('<html>502 Bad Gateway</html>', { status: 502 })
  ).then(
    () => null,
    (error: unknown) => (error instanceof KunOAuthError ? error : null)
  )
  check('502 HTML → reason', gateway502?.reason, 'server_error')
  check('502 HTML → transient', gateway502?.transient, true)

  // 代理返回的 403 HTML 不是「账号封禁」—— 只有解析成功的 OAuth body 才按 403 判封禁。
  const proxy403 = await readOAuthResponse(
    new Response('<html>403 Forbidden</html>', { status: 403 })
  ).then(
    () => null,
    (error: unknown) => (error instanceof KunOAuthError ? error : null)
  )
  check('403 HTML 不判封禁 → reason', proxy403?.reason, 'unknown')

  console.log(
    failed === 0
      ? '\n全部通过：兼容读取器在切换前后都能正确解析。'
      : `\n${failed} 项失败。`
  )
  if (failed > 0) {
    process.exitCode = 1
  }
}

void main()
