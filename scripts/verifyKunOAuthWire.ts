// NextMoe·未萌 OAuth 线格式自测。协议端点只回裸 RFC，不测信封解包。
//
//   pnpm exec esno scripts/verifyKunOAuthWire.ts

import {
  KUN_OAUTH_SERVER_URL_DEFAULT,
  KUN_OAUTH_WEB_URL_DEFAULT,
  KunOAuthError,
  kunOAuthServerUrl,
  kunOAuthWebUrl,
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
  const savedServerUrl = process.env.KUN_OAUTH_SERVER_URL
  const savedWebUrl = process.env.KUN_OAUTH_WEB_URL
  try {
    console.log('\n/oauth/token 成功（裸 RFC，不解析 refresh_token）')
    const opaqueRefresh = 'not.a.jwt.and.must.stay.opaque'
    const standardToken = {
      access_token: 'TOK',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: opaqueRefresh,
      scope: 'openid profile email'
    }
    const token = readOAuthBody<KunOAuthTokenData>(standardToken, 200)
    check('标准格式 access_token', token.access_token, 'TOK')
    check('refresh_token 原样保留、不解析', token.refresh_token, opaqueRefresh)

    const envelope = readOAuthBody<Record<string, unknown>>(
      { code: 0, data: { access_token: 'TOK' } },
      200
    )
    check('信封不被解成 access_token=TOK', envelope.access_token, undefined)
    check('信封 code 留在顶层', envelope.code, 0)

    console.log('\n失败映射')
    checkFailure(
      'invalid_grant',
      { error: 'invalid_grant', error_description: '无效的授权码' },
      400,
      'invalid_grant',
      false
    )
    checkFailure(
      'invalid_client',
      { error: 'invalid_client', error_description: '无效的客户端' },
      401,
      'invalid_client',
      false
    )
    checkFailure(
      'invalid_token',
      { error: 'invalid_token', error_description: 'token 已失效' },
      401,
      'invalid_token',
      false
    )
    checkFailure(
      '未知 error',
      { error: 'brand_new_error_code' },
      400,
      'unknown',
      true
    )
    checkFailure(
      '5xx server_error',
      { error: 'server_error', error_description: '内部故障' },
      500,
      'server_error',
      true
    )

    console.log('\n403')
    checkFailure(
      '403 非 insufficient_scope → banned',
      { error: 'invalid_token', error_description: '账号已封禁' },
      403,
      'banned',
      false
    )
    checkFailure(
      '403 insufficient_scope',
      { error: 'insufficient_scope', error_description: 'scope 不足' },
      403,
      'invalid_scope',
      false
    )

    console.log('\n空 body / 非 JSON')
    const emptyOk = await readOAuthResponse<undefined>(
      new Response('', { status: 200 })
    )
    check('空 body 200 → undefined', emptyOk, undefined)
    const okText = await readOAuthResponse<undefined>(
      new Response('OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    )
    check('revoke 200 OK → undefined', okText, undefined)
    const proxy403 = await readOAuthResponse(
      new Response('<html>403 Forbidden</html>', { status: 403 })
    ).then(
      () => null,
      (error: unknown) => (error instanceof KunOAuthError ? error : null)
    )
    check('非 JSON 403 不是 banned', proxy403?.reason, 'unknown')
    check('非 JSON 403 瞬态', proxy403?.transient, true)

    console.log('\n/oauth/userinfo')
    const user = readOAuthBody<KunOAuthUserInfo>(
      { id: 1007, sub: 'uuid-1', roles: ['user'], name: 'kun' },
      200
    )
    check('可缺 email 键', Object.hasOwn(user, 'email'), false)
    check('保留 id', user.id, 1007)
    check('保留 roles[0]', user.roles?.[0], 'user')
    check('保留 sub', user.sub, 'uuid-1')

    console.log('\nkunOAuthServerUrl')
    delete process.env.KUN_OAUTH_SERVER_URL
    check('空值回落默认', kunOAuthServerUrl(), KUN_OAUTH_SERVER_URL_DEFAULT)
    process.env.KUN_OAUTH_SERVER_URL = ''
    check('空串回落默认', kunOAuthServerUrl(), KUN_OAUTH_SERVER_URL_DEFAULT)
    process.env.KUN_OAUTH_SERVER_URL = 'https://oauth.kungal.com'
    check('退役主机回落默认', kunOAuthServerUrl(), KUN_OAUTH_SERVER_URL_DEFAULT)
    process.env.KUN_OAUTH_SERVER_URL = 'https://oauth.kungal.com/api/v1'
    check(
      '退役 /api/v1 回落默认',
      kunOAuthServerUrl(),
      KUN_OAUTH_SERVER_URL_DEFAULT
    )
    process.env.KUN_OAUTH_SERVER_URL = 'http://127.0.0.1:9277/api/v1'
    check(
      '自建地址原样保留',
      kunOAuthServerUrl(),
      'http://127.0.0.1:9277/api/v1'
    )
    delete process.env.KUN_OAUTH_SERVER_URL
    delete process.env.KUN_OAUTH_WEB_URL
    check('生产 Web 源', kunOAuthWebUrl(), KUN_OAUTH_WEB_URL_DEFAULT)
    process.env.KUN_OAUTH_SERVER_URL = 'http://127.0.0.1:9277/api/v1'
    check('自建 Web 源', kunOAuthWebUrl(), 'http://127.0.0.1:9420')
    process.env.KUN_OAUTH_WEB_URL = 'http://127.0.0.1:9421'
    check('KUN_OAUTH_WEB_URL 覆盖', kunOAuthWebUrl(), 'http://127.0.0.1:9421')
  } finally {
    if (savedServerUrl === undefined) {
      delete process.env.KUN_OAUTH_SERVER_URL
    } else {
      process.env.KUN_OAUTH_SERVER_URL = savedServerUrl
    }
    if (savedWebUrl === undefined) {
      delete process.env.KUN_OAUTH_WEB_URL
    } else {
      process.env.KUN_OAUTH_WEB_URL = savedWebUrl
    }
  }

  console.log(failed === 0 ? '\n全部通过。' : `\n${failed} 项失败。`)
  if (failed > 0) {
    process.exitCode = 1
  }
}

void main()
