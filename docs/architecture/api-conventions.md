# 后端与 API 约定

本文描述 `app/api/` Route Handler、页面 `actions.ts` 和服务端数据层的写法。
新增接口时按这里的模式实现，不要另起一套。

## 目录与分层

一个资源目录通常长这样（以 `app/api/patch/resource/` 为例）：

```text
app/api/patch/resource/
├── route.ts      # HTTP 入口：解析参数 → 鉴权 → 调业务函数 → 返回 JSON
├── get.ts        # 业务函数，可被 route.ts 和页面 actions.ts 共同调用
├── create.ts
├── update.ts
├── delete.ts
└── _helper.ts    # 以下划线开头的是目录私有工具
```

- `route.ts` 只做编排，业务逻辑放在同目录的具名文件里并导出。
- 页面不经 HTTP 调 API，而是在 `app/(main)/**/actions.ts`、`app/admin/**/actions.ts`
  （`'use server'`）中直接 import 这些业务函数。actions 里需要请求级去重时用
  `react` 的 `cache()` 包一层（见 `app/(main)/[id]/actions.ts`）。
- 跨目录共享的后端工具放 `app/api/utils/`；与外部服务的客户端放 `lib/`。

## 参数校验

- schema 统一写在 `validations/<域>.ts`，前端表单（react-hook-form + zodResolver）
  与后端共用同一个 schema。
- Route Handler 用 `app/api/utils/parseQuery.ts` 的解析器：
  `kunParseGetQuery`、`kunParsePostBody`、`kunParsePutBody`、`kunParseDeleteQuery`、
  `kunParseFormData`。它们成功时返回解析后的数据，失败时返回 **错误字符串**，
  调用方以 `typeof input === 'string'` 判断。
- actions 里对普通对象用 `utils/actions/safeParseSchema.ts`，返回约定相同。
- `kunParseFormData` 会把同名多值字段合并成数组，文件字段保持 `File`。

## 鉴权

- Route Handler：`verifyHeaderCookie(req)`（`middleware/_verifyHeaderCookie.ts`），
  从请求 Cookie 解 JWT 并核对 Redis 白名单，返回 `{ uid, name, role }` 或 `null`。
- Server Component / actions：`utils/actions/verifyHeaderCookie.ts`，签名不带参数，
  内部读 `next/headers` 的 `cookies()`。两个同名函数不要混用。
- 角色判断直接写在路由里，常见写法 `if (payload.role < 3)` 表示仅管理员。
  角色含义见 [auth.md](./auth.md#角色与状态)。

## 返回格式：两种并存

仓库里有两种错误返回风格，修改已有路由时 **保持该路由原有风格**，避免破坏对应的前端：

| 风格 | 写法 | 前端处理 |
| --- | --- | --- |
| 旧式（多数路由） | HTTP 200，错误时 body 是一个 JSON 字符串：`NextResponse.json('用户未登录')` | `kunErrorHandler(res, cb)`：`res` 是字符串就 toast，否则执行回调 |
| 新式（`edit`、`spider`、`identify`、`upload`、OAuth 等） | 真实 HTTP 状态码 + `{ error: string }` | `kunFetch*` 对非 2xx 抛 `KunFetchError`，用 `getKunFetchErrorMessage(e)` 取文案 |

新写的接口优先用新式。全局类型 `KunResponse<T> = string | T`（`types/response.d.ts`）
描述的是旧式约定。

## 前端请求

客户端统一用 `utils/kunFetch.ts` 的 `kunFetchGet/Post/Put/Patch/Delete/FormData`：

- 开发环境用相对路径；生产环境拼接 `NEXT_PUBLIC_KUN_PATCH_ADDRESS_PROD`，
  因此该变量必须是站点公网源，不能是 localhost 或 CDN。
- 始终 `credentials: 'include'`，依赖 HttpOnly Cookie 鉴权。

## 缓存

| 层 | 位置 | 说明 |
| --- | --- | --- |
| 页面 ISR | 各 `page.tsx` 的 `export const revalidate = 3` | 3 秒级再验证 |
| Redis 短缓存 | `getPatchById` → `patch:<uniqueId>`；`getPatchIntroduction` → 同前缀 | TTL 由 `config/cache.ts` 控制（30 秒），**更新时不主动删除**，依赖过期 |
| Redis 运行时配置 | `admin:config:redirect`、迁移公告等 | 首次读取从 `config/*.json` 回填，管理后台写 Redis |
| CDN | Cloudflare | 更新封面后调用 purge API（`app/api/patch/banner/route.ts`） |

改动详情数据结构时注意：旧结构会在 Redis 里最多残留一个 TTL 周期。

## 副作用约定

- 站内通知写 `user_message`，用 `app/api/utils/message.ts` 的 `createMessage` /
  `createDedupMessage`（后者对完全相同的消息去重）。类型取值见 `constants/message.ts`。
- 管理员操作写 `admin_log`。有数据变更的操作把日志与主操作放进同一个
  `prisma.$transaction`（参考 `app/api/admin/resource/delete.ts`）。
- 计数类字段（下载量、浏览量、点赞数）用 Prisma `increment`，多表计数放进
  `prisma.$transaction`。

## 外部请求

- 服务端 `fetch` 已被 `instrumentation.ts` 强制 IPv4；axios 必须使用 `spiderHttp`。
- 任何由用户输入决定的出站 URL 必须先过 `utils/ssrfGuard.ts` 的 `guardOutboundUrl`，
  并设置 `redirect: 'manual'` 手动逐跳校验。详见 [security.md](./security.md)。
- 外部服务失败要降级：缓存读写失败按 miss 处理，外部 API 超时返回空结果而不是让
  页面报错（参考 `lib/nextmoe/purchaseLink.ts`、`app/api/identify/animetrace.ts`）。
