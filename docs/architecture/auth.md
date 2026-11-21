# 认证、会话与权限

## 会话模型

本站自签 JWT，Cookie + Redis 白名单双重校验：

| 项 | 值 |
| --- | --- |
| 会话 Cookie | `kun-galgame-patch-moe-token`（HttpOnly，`sameSite: strict`，30 天） |
| 签发 | `generateKunToken(uid, name, role, '30d')`（`app/api/utils/jwt.ts`） |
| 载荷 | `{ iss, aud, uid, name, role }`，HS256，`JWT_ISS` / `JWT_AUD` / `JWT_SECRET` |
| 白名单 | Redis `access:token:<uid>`，签发时写入，TTL 30 天 |
| 校验 | `verifyKunToken`：验签 + 白名单键存在，任一失败返回 `null` |
| 登出 | `deleteKunToken(uid)` 删除白名单键，该用户所有设备同时失效 |

要点：

- 每个用户只有一个白名单键，但校验只看“键是否存在”，不比对 token 内容。
  JWT 里的 `role` 是签发时的快照，不会自动刷新，因此角色和状态变更必须配合吊销会话：
  - 后台修改用户（`app/api/admin/user/update.ts`，含改角色、封禁）会先 `deleteKunToken`，
    对方需重新登录，新 token 带最新角色；
  - 后台永久删除用户（`app/api/admin/user/delete.ts`）在事务完成后 `deleteKunToken`；
  - 创作者审批（`app/api/admin/creator/approve`）只把角色从 1 改为 2，不吊销会话。
    这是安全的，因为所有“创作者及以上”判断（对象存储上传、图片上传限额）都从数据库读角色。
  - 新增修改 `role` / `status` 的代码时，要么调用 `deleteKunToken`，要么让相关权限判断
    从数据库读取角色，不能只依赖 `payload.role`。
- `JWT_SECRET` 至少 32 字符，且不能是上游公开默认值，`validations/dotenv-check.ts`
  在启动和构建时拒绝不合规的值。
- OAuth 回调签发会话时必须使用同一个 Cookie 名，否则中间件和路由都识别不到登录态。

## 中间件

`middleware.ts` → `middleware/auth.ts`：

- 匹配除 `/api`、静态资源外的所有页面，以及 `/api/admin/*`。
- `/api/admin/*`：没有会话 Cookie 直接返回 401 JSON。
- 受保护页面：`/admin`、`/comment`、`/edit` 前缀，以及 `/user/*`（排除
  `/user/profile/*`、`/user/status*`）。没有 Cookie 时普通请求重定向到 `/login`，
  RSC 预取请求返回 401 JSON。
- 重定向地址优先取 `Origin` / `Referer` / `x-forwarded-*`，避免 standalone 部署下
  被归一化成 `localhost`。
- 中间件 **只判断 Cookie 是否存在**，不验签。签名与角色校验必须在路由或 actions
  内完成（见 [api-conventions.md](./api-conventions.md#鉴权)）。

## 本地账号流程

| 流程 | 入口 | 说明 |
| --- | --- | --- |
| 人机验证 | `app/api/auth/captcha/` | 从 `server/image/auth/white`、`other` 随机抽图，用户选出“白毛女孩子”。通过后发一次性码 `captcha:verify:<code>`（1 小时，用后即删） |
| 注册验证码 | `app/api/auth/send-register-code/` | 检查注册开关 `admin:setting:register`、永久封禁键 `admin:delete:user:<email/ip>`；同邮箱、同 IP 60 秒限流（`limit:email:*`、`limit:ip:*`） |
| 注册 | `app/api/auth/register/` | 校验邮件验证码后建号 |
| 登录 | `app/api/auth/login/` | 用户名或邮箱（大小写不敏感）+ 密码 + 验证码；`status === 2` 拒绝登录 |
| 两步验证 | `app/api/auth/verify-2fa/` | 开启 2FA 的账号登录时先发 10 分钟临时 Cookie `kun-galgame-patch-moe-2fa-token`，再校验 TOTP 或备用码 |
| 找回密码 | `app/api/forgot/one`、`two` | 邮件验证码重置 |

密码用 argon2id（`@noble/hashes`）哈希，存储格式 `salt:hash`，见
`app/api/utils/algorithm.ts`。

## NextMoe·未萌 OAuth

协议细节与线上状态见 [OAuth 接入指南](../oauth-integration-guide.md) 和
[OAuth 线格式状态](../standard-wire-migration.md)。本站实现：

- `app/api/auth/oauth/kun/login`：生成 PKCE + state，写 10 分钟临时 Cookie 后跳转授权端点，
  scope 为 `openid profile email`。`?action=register` 跳注册页，`?action=bind` 进入绑定模式
  （要求已登录）。
- `app/api/auth/oauth/kun/callback`：校验 state → 换 token → 取 userinfo →
  按 `(provider, provider_user_id)` 查 `user_oauth_account` 决定登录、建号或拒绝 →
  签发本站会话 → `revoke` 即弃。**不保存、不刷新** 第三方 token。
- 授权邮箱已被本地账号占用时不自动合并，回跳 `/login?error=email_exists`。
  错误码约定写在 callback 文件头注释里，前端 `/login` 与 `/settings/user` 据此提示。
- OAuth 建号的用户密码字段写占位值 `OAUTH_PLACEHOLDER_PASSWORD`，
  `hasUsablePassword` 用来判断能否解绑（`app/api/utils/oauth/placeholderPassword.ts`）。
- 相关环境变量：`KUN_OAUTH_CLIENT_ID`、`KUN_OAUTH_CLIENT_SECRET`、
  `KUN_OAUTH_SERVER_URL`、`KUN_OAUTH_REDIRECT_URI`，可选 `KUN_OAUTH_WEB_URL`。
  它们不在 `dotenv-check.ts` 的 schema 里，缺失时不会在启动时报错。
- 自测脚本：`pnpm verify:oauth-wire`。

## 角色与状态

`user.role`（`constants/user.ts`）：

| 值 | 名称 | 典型权限 |
| --- | --- | --- |
| 1 | 用户 | 评论、收藏、发帖；发布补丁类资源（不能用 `lycorisgal` 资源盘、不能发 `galgame` 分区）；每日图片上传 50 张上限 |
| 2 | 创作者 | 上传文件到对象存储（每次需人机验证，单文件 ≤100MB，每日 5GB）；图片上传不限次 |
| 3 | 管理员 | 创建/编辑/删除 Galgame 条目、导入元数据、管理后台、管理他人资源 |
| 4 | 超级管理员 | 管理员权限外加：永久删除用户（`DELETE /api/admin/user`）、群发邮件（`app/api/admin/mail`）、把用户设为管理员 |

- 角色判断写在各路由里，约定如下，新增代码沿用同一阈值，前端按钮的显示条件要与后端一致：
  - 仅管理员：`payload.role < 3` 时拒绝；
  - 创作者及以上：`role >= 2`，用于对象存储上传、图片上传不限次；
  - 仅超级管理员：`role < 4` 时拒绝；
  - 删除条目评论、话题评论：作者本人或 `role >= 3`；删除话题仅限 `role >= 3`
    （作者也不能删）；
  - 编辑话题、编辑话题评论仅限作者本人，编辑条目评论允许作者或 `role >= 3`。
- 用户至少发布 3 个资源后可在 `/apply` 申请成为创作者，管理员在后台
  `admin/creator` 审批。
- `user.status`：0 正常，1 限制（未完成），2 封禁。封禁用户无法登录，OAuth
  回调同样拦截。
- 永久删除用户时，其邮箱和 IP 写入 `admin:delete:user:*`，阻止重新注册。
  本地开发误封时可用 `scripts/unban-local-ip.ts` 解除 `127.0.0.1`。
