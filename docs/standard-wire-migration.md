# OAuth 线格式状态

协议端点线格式迁移已经完成。本文只记录当前状态，不再作为切换前的操作指南。

- 生产 issuer：`https://account.nextmoe.com`
- Discovery：`https://account.nextmoe.com/.well-known/openid-configuration`
- `oauth.kungal.com` 已不可达，不要再当作生产主机。
- `/oauth/token`、`/oauth/userinfo`、`/oauth/revoke` 已是裸 RFC 6749 / RFC 6750 / RFC 7009 JSON，没有 `{code,message,data}` 信封。
- 本仓库客户端不再解信封。
- `refresh_token` 是不透明随机串；本站换完即弃，不解析、不保存。
- 线上 `POST /oauth/revoke` 成功是 `200` + `text/plain` body `OK`，不是空 body。客户端把 2xx 非 JSON 当成功。
- 浏览器注册页是 `https://account.nextmoe.com/auth/register`。`/api/v1/auth/register` 未登录返回 `{"code":10001,"message":"未授权，请先登录"}`。
- `GET /api/v1/oauth/authorize` 在 client 有效时 `303` 到 Web 源 `/oauth/authorize`。

对接细节见 [OAuth 接入指南](./oauth-integration-guide.md)。
