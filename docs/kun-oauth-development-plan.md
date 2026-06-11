# 鲲 Galgame OAuth 接入开发计划（lycorisgal）

> 基于 [oauth-integration-guide.md](./oauth-integration-guide.md) 与本项目认证系统现状分析编写。
> 编写日期：2026-06-11

---

## TL;DR

本项目（lycorisgal）目前是**纯自研本地认证**：用户名/邮箱 + Argon2id 密码 + 自签 JWT（30 天，存 Redis）+ 可选 TOTP 2FA，**没有任何 OAuth 基础设施**——没有 OAuth 库、没有回调路由、用户表没有第三方身份绑定字段。接入鲲 OAuth 属于从零新增，而非改造既有 OAuth 框架。

推荐方案：**confidential client + 全服务端流程 + "OAuth 只做身份源"的轻接入**——用 KUN 账号换取身份后立即签发本站既有的 30 天 JWT，不保留 OAuth token，从而完全避开接入指南 §4 里 refresh 的全部雷区（token 轮换、并发刷新单飞锁、client_id 串台）。

---

## 一、现状与文档要求的差距

| 维度 | 文档要求 | 本项目现状 |
|------|---------|-----------|
| 客户端类型 | Next.js SSR → confidential（`is_public=false`）+ 必须 PKCE | 无 OAuth 客户端 |
| 用户身份绑定 | 用 `sub`（UUID）作唯一标识查找/创建用户 | `prisma/schema.prisma` 的 `user` 模型无 `oauth_provider`/`oauth_id` 字段 |
| 回调路由 | 需要 redirect_uri 完全匹配的回调端点 | `app/api/auth/` 下只有 login/register/verify-2fa 等本地认证路由 |
| 登录 UI | 「使用 KUN 账号登录」按钮 | `components/login/Login.tsx` / `components/register/Register.tsx` 均无第三方入口 |
| 环境变量 | `OAUTH_SERVER_URL` / `CLIENT_ID` / `CLIENT_SECRET` / `REDIRECT_URI` | 已有 `KUN_OAUTH_CLIENT_ID` / `KUN_OAUTH_CLIENT_SECRET`（2026-06-11 注册后加入）；**仍缺** `KUN_OAUTH_SERVER_URL` / `KUN_OAUTH_REDIRECT_URI` |

### 本项目既有认证体系（可复用部分）

- **JWT 签发**：`app/api/utils/jwt.ts` 的 `generateKunToken(uid, name, role, '30d')`，payload 含 `iss/aud/uid/name/role`，同时在 Redis 写 `access:token:<uid>` 副本
- **Session cookie**：httpOnly cookie `kun-galgame-patch-moe-token`
- **用户模型**：`user` 表，`name @unique varchar(17)`、`email @unique`、`password` 必填（Argon2id `salt:hash`）、`avatar`、`role`、`status`（2=封禁）
- **中间件**：`middleware/auth.ts` 从 cookie 解 JWT

OAuth 登录完成后直接复用上述 session 体系即可，对既有认证代码近乎零侵入。

---

## 二、关键架构决策

### 1. client 类型：confidential（`is_public=false`）

Next.js 服务端代理 token 交换，浏览器看不到 token 流转，符合接入指南 §1.2 判别标准（与 kungal/moyu 同形态）。`client_secret` 只存在服务端环境变量。同时按指南 §9 要求始终带 PKCE（S256）。

### 2. token 策略：换完即弃（推荐）

本项目有自己的 session（30 天 JWT），OAuth 只承担"证明你是谁"：

```
callback 里用 code 换 access_token
  → 调 /oauth/userinfo 拿 sub/name/email/picture
  → 创建/关联本地用户
  → 签发本站 JWT
  → 调 /oauth/revoke 吊销 refresh_token
```

收益：

- 不需要实现 token 轮换、15 分钟刷新、并发刷新单飞锁（指南 §4.4 整节的坑都不存在）
- 不存在 §4.3 的多站 Redis/cookie 串台风险（本站 cookie 名 `kun-galgame-patch-moe-token` 已经唯一）

代价：

- 用户在 KUN 端改名/换头像，本站要等下次 OAuth 登录才同步（每次登录时更新一次即可）
- 指南 §10 的"下游不缓存用户字段、批量回拉"是针对完成用户迁移的 kungal/moyu 系站点，本项目是独立用户体系的普通第三方，**不适用**

即便如此，**注册 client 时 `grants` 仍同时勾选 `authorization_code` 和 `refresh_token`**（指南反复强调的头号坑），为将来升级留余地。

### 3. state/verifier 存储：服务端 httpOnly cookie，不用 sessionStorage

指南示例是 Nuxt SPA 风格；App Router 下更优的做法是发起登录的 route handler 生成 state + code_verifier，写入 10 分钟过期的 httpOnly cookie，callback（GET）直接在服务端校验，全程不经过前端 JS，也省掉一个客户端中转页。

### 4. 账号模型：独立绑定表，不在 user 上加列

新建 `user_oauth_account` 表（`provider` + `provider_user_id` 复合唯一），好处是支持"已有本地账号绑定 KUN 账号"和未来多 provider，不污染 user 模型。

---

## 三、设计细节与坑位预判

| 坑位 | 方案 |
|------|------|
| **用户名冲突与截断** | 本站 `name` 是 `@unique varchar(17)`，KUN 用户名可能重名或超长。首登创建用户时截断到 17 字符，冲突时加随机后缀 |
| **password 非空约束** | OAuth 首登用户没有密码，但 `password` 列必填。写入随机不可用哈希，用户可走已有的"忘记密码"流程补设 |
| **邮箱撞车** | KUN 邮箱与已有本地账号邮箱相同时，**不要静默自动合并**（防账号接管）。首期提示"该邮箱已注册，请先登录后在设置中绑定"；绑定功能放二期 |
| **2FA 交互** | OAuth 登录信任 KUN 端身份，跳过本地 2FA（业界惯例，身份已被 IdP 担保） |
| **封禁双重检查** | 本地 `status === 2` 照常拦；OAuth 端返回 `10014`（KUN 端封号）时跳错误页而非登录页（指南 §7 明确要求） |
| **响应格式** | 所有 OAuth API 是 `{code, message, data}` 包裹格式，`code !== 0` 即错误，需要统一的错误码→用户提示映射。重点：15003 授权码过期→引导重试、15004 PKCE 不匹配、15002 回调地址错配 |

---

## 四、分阶段开发计划

### 阶段 0 — 外部准备（人工，0 代码）

> **状态**：✅ 已完成（2026-06-11）—— client 已注册，`client_secret` 已写入 `.env`，`.env.example` 已含 `KUN_OAUTH_CLIENT_ID` / `KUN_OAUTH_CLIENT_SECRET` 占位。

在鲲 OAuth 管理后台注册 client：

| 字段 | 取值 |
|------|------|
| `is_public` | `false`（confidential） |
| `grants` | `["authorization_code", "refresh_token"]`（**两个都勾**） |
| `allowed_scopes` | 含 `openid profile email` |
| `redirect_uris` | 精确填开发/生产两条回调，如 `http://127.0.0.1:3000/api/auth/oauth/kun/callback` 与生产域名版 |

- `client_secret` 只显示一次，立即入库到 `.env`
- 若本站域名不在 CORS 白名单，请 KUN 端添加（指南 §9.6）
- OAuth Server 地址：开发 `http://127.0.0.1:9277/api/v1`，生产 `https://oauth.kungal.com/api/v1`

### 阶段 1 — 数据层（~半天）

`prisma/schema.prisma` 新增模型 + 迁移：

```prisma
model user_oauth_account {
  id               Int      @id @default(autoincrement())
  user_id          Int
  provider         String   @db.VarChar(50)   // 'kun-oauth'
  provider_user_id String   @db.VarChar(100)  // userinfo.sub (UUID)
  created          DateTime @default(now())
  updated          DateTime @updatedAt
  user             user     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([provider, provider_user_id])
  @@index([user_id])
}
```

### 阶段 2 — 服务端 OAuth 流程（核心，~1-2 天）

新建文件：

| 文件 | 职责 |
|------|------|
| `app/api/utils/oauth/pkce.ts` | verifier/challenge/state 生成（Node `crypto`，指南 §3 步骤 1 的服务端版） |
| `app/api/utils/oauth/kunOAuthClient.ts` | 薄客户端：`exchangeCode()`、`getUserInfo()`、`revoke()`，统一解 `{code, message, data}` 包裹与错误码映射 |
| `app/api/auth/oauth/kun/login/route.ts`（GET） | 生成 PKCE+state → 写 httpOnly 临时 cookie（10 分钟过期）→ 302 到 `/oauth/authorize`；带 `?action=register` 时按指南 §2 改拼 `/auth/register?redirect=encoded(...)` 跳转 |
| `app/api/auth/oauth/kun/callback/route.ts`（GET） | 见下方流程 |

callback 处理流程：

```
1. 校验 state（与 httpOnly cookie 比对，失败 → /login?error=invalid_state）
2. 服务端换 token（带 client_secret + code_verifier）
3. 调 /oauth/userinfo 拿 { sub, name, email, picture }
4. 按 (provider='kun-oauth', provider_user_id=sub) 查 user_oauth_account：
   - 命中 → 更新本地 name/avatar → 登录
   - 未命中 + 邮箱无冲突 → 创建用户（用户名截断/去重、随机密码哈希）+ 绑定记录 → 登录
   - 未命中 + 邮箱冲突 → 302 /login?error=email_exists
5. 检查本地 status === 2 封禁 → 拦截
6. 复用 generateKunToken 签发本站 JWT + 设 cookie kun-galgame-patch-moe-token
7. 调 /oauth/revoke 吊销 refresh_token（换完即弃）
8. 302 回首页
```

### 阶段 3 — UI（~半天）

- `components/login/Login.tsx`：`<KunTextDivider text="或" />` 后加「使用鲲 Galgame 账号登录」按钮（指向 `/api/auth/oauth/kun/login`），并处理回调失败时 URL 上的错误参数提示
- `components/register/Register.tsx`：同位置加注册入口（`?action=register`）
- 可选：`/login?error=...` toast 提示；登录成功后前端需要刷新 `UserState`，可让 callback 302 到一个会重新拉取用户信息的页面，或直接利用现有的初始化逻辑

### 阶段 4 — 环境变量与文档（~1 小时）

`KUN_OAUTH_CLIENT_ID` / `KUN_OAUTH_CLIENT_SECRET` 已就位（阶段 0），`.env.example` 还需补齐：

```env
KUN_OAUTH_SERVER_URL = 'http://127.0.0.1:9277/api/v1'
KUN_OAUTH_REDIRECT_URI = 'http://127.0.0.1:3000/api/auth/oauth/kun/callback'
```

生产环境分别取 `https://oauth.kungal.com/api/v1` 与生产域名回调（必须与阶段 0 注册的 `redirect_uris` 完全匹配）。

### 阶段 5 — 测试（~1 天）

重点用例：

- [ ] 正常首登创建用户（用户名截断、随机密码、绑定记录落库）
- [ ] 二次登录走绑定记录，且同步 KUN 端最新 name/avatar
- [ ] state 不匹配拒绝
- [ ] code 过期（15003）重试引导
- [ ] KUN 端封号（10014）跳错误页而非登录页
- [ ] 本地封禁（status=2）拦截
- [ ] KUN 用户名超 17 字符 / 与本地重名时的落库结果
- [ ] 邮箱冲突时的提示与不合并行为
- [ ] revoke 调用成功（refresh_token 不残留）

---

## 五、二期（可选）

1. **绑定/解绑**：设置页"绑定/解绑 KUN 账号"——已登录用户发起同一授权流程，callback 区分绑定模式；解绑前校验用户已设置本地密码（防锁死）
2. **KUN 端踢人即时生效**：需引入 refresh_token 持久化——届时必须实现指南 §4.4 的单飞锁 + 等赢家轮询（整份指南里最深的坑），以及 §4.1 的五项 refresh 校验条件

---

## 六、工作量估计

| 阶段 | 工作量 |
|------|--------|
| 阶段 0 外部准备 | 人工沟通，0 代码 |
| 阶段 1 数据层 | ~半天 |
| 阶段 2 服务端流程 | ~1-2 天 |
| 阶段 3 UI | ~半天 |
| 阶段 4 环境变量 | ~1 小时 |
| 阶段 5 测试 | ~1 天 |
| **合计** | **3~4 个人日，新增代码约 500~700 行** |

对既有认证代码近乎零侵入（只增不改，登录/注册 UI 各加一个按钮）。

---

## 七、开发会话拆分（标准化执行单元）

> 本节把 §四 的阶段（1–5）落到**会话级执行单元**：每个 Cn 是一次独立对话能高质量闭合的最小内聚切片。划分原则（基于大模型上下文 / 注意力 / 性能）：
> 1. **单层内聚**：一个会话只跨一个架构层（地基 / 纯工具 / 路由 / UI / 测试），避免「后端+前端+测试」混在一会话稀释注意力。
> 2. **有界阅读**：每会话只需读 ≤5 个参考文件 + 本计划 1–2 个小节 + 接入指南对应 §，不必通读全仓。
> 3. **可验收收口**：每会话以可执行判据结束（迁移成功 / typecheck 绿 / 浏览器可演示）。本项目**无单测基建**（无 vitest/jest），验收以 `pnpm typecheck` / `pnpm lint` / `pnpm build` + 手动验证为准。
> 4. **前向依赖单向**：Cn 只依赖更小号会话产物，后续会话靠「已落地文件 + 本计划」即可独立续接，不需要前一会话的上下文。
> 5. **详细内容不复制**：每单元只给「目标 / 交付物 / 前置 / 复用 / 计划锚点 / 验收 / 边界」，实现细节回查本计划对应 § 与 [oauth-integration-guide.md](./oauth-integration-guide.md) 对应 §。

### 7.1 会话总览

| 会话 | 阶段 | 层 | 主题 | 前置 |
|---|---|---|---|---|
| **C1** | 阶段 1+4 | 地基/迁移 | `user_oauth_account` 表 + 迁移 + 环境变量补全 | —（阶段 0 已完成） |
| **C2** | 阶段 2 前半 | 纯工具层 | `pkce.ts` + `kunOAuthClient.ts`（薄客户端 + 错误码映射） | C1 |
| **C3** | 阶段 2 后半 | 路由（核心） | login 发起路由 + callback 回调路由 + 用户 provision + 本站 JWT 签发 | C1, C2 |
| **C4** | 阶段 3 | 前端 | 登录/注册页 KUN OAuth 入口 + 错误提示 + 登录态刷新 | C3 |
| **C5** | 阶段 5 | 测试/收尾 | 全链路手动测试清单 + 修复 + 文档 tick | C1–C4 |
| **C6**（二期·可选） | §五 | 纵向切片 | 设置页绑定/解绑 KUN 账号 | C1–C5 |

> **可选合并**（低风险）：C1+C2（地基+纯工具都很小，一次过）。**不建议合并** C3+C4（跨后端/前端层，callback 的用户 provision 分支多，值得独占一个会话的注意力）。

### 7.2 标准化描述模板

每个执行单元统一按下列字段描述（实现细节回查对应 §）：

- **目标**：一句话产出
- **交付物**：本会话新增/改造文件（路径）
- **前置**：依赖的前序会话 + 既有基建
- **复用**：照搬的模板/参考文件
- **计划锚点**：本计划与接入指南对应小节
- **验收**：可验证完成判据
- **边界**：本会话明确不做（防蔓延）

### 7.3 执行单元

#### C1 · 数据层 + 环境变量地基〔阶段 1+4〕
- **目标**：`user_oauth_account` 绑定表落库、环境变量补全，`prisma generate` 通过，后续会话有类型可用。
- **交付物**：`prisma/schema.prisma`（新增 `user_oauth_account` 模型 + `user` 反向关系，见 §四·阶段 1 的 Prisma 定义）；`prisma/migrations/<ts>_kun_oauth_account/`；`.env.example`（补 `KUN_OAUTH_SERVER_URL` / `KUN_OAUTH_REDIRECT_URI`，`CLIENT_ID`/`SECRET` 已就位）；`.env` 同步（人工）。
- **前置**：阶段 0 已完成（client 已注册、secret 已入 `.env`）。
- **复用**：schema 中既有模型的写法（snake_case 模型名、`created`/`updated` 字段惯例、`onDelete: Cascade` 关系写法）；`prisma/migrations/` 既有迁移命名风格。
- **计划锚点**：本计划 §四·阶段 1、§四·阶段 4、§二·决策 4。
- **验收**：迁移应用成功 + `pnpm prisma:generate` + `pnpm typecheck` 通过；既有 `user` 表数据零破坏；`@@unique([provider, provider_user_id])` 就位（studio 或 DB 直查）。
- **边界**：不写任何路由/工具函数/UI；不动既有表的任何列。

#### C2 · OAuth 纯工具层〔阶段 2 前半〕
- **目标**：PKCE 生成与鲲 OAuth 薄客户端沉淀为无副作用的服务端工具，作为路由层的正确性内核。
- **交付物**：`app/api/utils/oauth/pkce.ts`（`generateCodeVerifier` / `generateCodeChallenge`(S256) / `generateState`，用 Node `crypto`，指南 §3 步骤 1 的服务端版）；`app/api/utils/oauth/kunOAuthClient.ts`（`exchangeCode()` / `getUserInfo()` / `revoke()`，统一解 `{code, message, data}` 包裹，`code !== 0` 抛带错误码的自定义异常，含错误码→用户提示映射表：10014/15002/15003/15004/15005/15006/15008）。
- **前置**：C1（环境变量名已定）。
- **复用**：接入指南 §3 步骤 1（PKCE 代码，浏览器 API 改 Node `crypto`）、§7 错误码表、§4 token 响应结构；项目内既有 `app/api/utils/` 工具文件的风格。
- **计划锚点**：本计划 §二·决策 1/3、§三「响应格式」行；指南 §1.3（Server 地址）、§3、§7。
- **验收**：`pnpm typecheck` 通过；用 `esno` 临时脚本验证 code_challenge 与 RFC 7636 S256 规范一致（base64url、无填充）；client 函数对非零 `code` 抛出可识别异常。
- **边界**：不写 route handler；不碰 Prisma/DB；不写 UI；不实现 refresh（换完即弃策略，§二·决策 2）。

#### C3 · 登录发起 + 回调路由（核心）〔阶段 2 后半〕
- **目标**：完整服务端 OAuth 流程跑通——发起授权、回调校验、用户创建/关联、本站 JWT 签发、token 即弃。
- **交付物**：`app/api/auth/oauth/kun/login/route.ts`（GET：PKCE+state → httpOnly 临时 cookie（10 分钟）→ 302 `/oauth/authorize`；`?action=register` 走指南 §2 的 `/auth/register?redirect=` 拼接）；`app/api/auth/oauth/kun/callback/route.ts`（GET：§四·阶段 2 的 8 步 callback 流程，含用户名截断 17/冲突加后缀、随机不可用密码哈希、邮箱冲突 302 `/login?error=email_exists`、本地 `status===2` 拦截、KUN 端 10014 跳错误页、`generateKunToken` 签发 + 设 cookie、revoke 即弃）；callback 错误参数约定（`error=invalid_state|email_exists|oauth_failed|banned` 等，C4 消费）。
- **前置**：C1（表与类型）、C2（pkce + client）。
- **复用**：`app/api/utils/jwt.ts` 的 `generateKunToken`；`app/api/auth/login/route.ts` 的 cookie 设置写法与 `UserState` 组装；`app/api/utils/algorithm.ts` 的 `hashPassword`（随机密码）；Prisma client 既有用法。
- **计划锚点**：本计划 §四·阶段 2（callback 8 步全流程）、§三（全表）；指南 §2、§3 步骤 2–6、§5、§7。
- **验收**：对接本地 dev OAuth Server（`http://127.0.0.1:9277/api/v1`）浏览器走通：首登创建用户 + 绑定记录落库；二次登录走绑定记录并同步 name/avatar；篡改 state 被拒；邮箱冲突正确 302；cookie `kun-galgame-patch-moe-token` 正确设置且中间件认可；`pnpm typecheck` 通过。
- **边界**：不改 `Login.tsx`/`Register.tsx`（仅定义好错误参数约定供 C4 消费）；不做绑定/解绑（C6）；不实现 refresh/单飞锁（二期）。

#### C4 · UI 接入〔阶段 3〕
- **目标**：登录/注册页出现「使用鲲 Galgame 账号登录」入口，回调失败有用户可读提示，登录成功后前端用户态正确刷新。
- **交付物**：`components/login/Login.tsx`（`<KunTextDivider text="或" />` 后加按钮，指向 `/api/auth/oauth/kun/login`；读 URL `error=` 参数给 toast 提示）；`components/register/Register.tsx`（同位置加注册入口，`?action=register`）；确认/打通 callback 302 后 `UserState` 刷新路径（store 重新拉取或初始化逻辑覆盖）。
- **前置**：C3（路由与错误参数约定已落地）。
- **复用**：HeroUI `Button` 既有用法（参照「忘记密码」按钮）；`KunTextDivider`；项目既有 toast 与 user store；login 成功后的 store 写入方式（参照 `Login.tsx` 现有 `handleSubmit` 收尾）。
- **计划锚点**：本计划 §四·阶段 3；指南 §2（注册按钮拼接）、§8.2（按钮形态参考）。
- **验收**：浏览器全流程可演示：点按钮 → KUN 登录 → 跳回 → 已登录态（头像/用户名正确显示）；每个 `error=` 参数有对应中文提示；`pnpm lint` + `pnpm typecheck` 通过。
- **边界**：不改后端路由逻辑；不做设置页绑定 UI；不调整登录页其他既有元素。

#### C5 · 全链路测试 + 收尾〔阶段 5〕
- **目标**：过 §四·阶段 5 的 9 项测试清单，修复发现的问题，文档 tick 收口。
- **交付物**：清单逐项验证并在本计划 §四·阶段 5 打钩（含验证方式备注）；发现 bug 的修复 commit；`pnpm build` 全量构建验证。
- **前置**：C1–C4 全部落地。
- **复用**：§四·阶段 5 用例清单；本地 dev OAuth Server。
- **计划锚点**：本计划 §四·阶段 5、§三（坑位逐项回查）。
- **验收**：9 项清单全过（重点：KUN 用户名超 17 字符/重名落库、10014 跳错误页而非登录页、revoke 成功不残留）；`pnpm build` 通过。
- **边界**：仅测试/修复/文档，不新增功能；二期内容（C6）不做。

#### C6 ·（二期·可选）绑定/解绑 KUN 账号
- **目标**：已登录用户在设置页绑定/解绑 KUN 账号，解绑有防锁死校验。
- **交付物**：设置页绑定入口 UI；login 路由加 `?action=bind` 模式（已登录发起，callback 区分绑定模式：`sub` 已被他人绑定→报错，未绑定→写 `user_oauth_account`）；解绑 API（校验用户已设置可用密码，防止解绑后无法登录）。
- **前置**：C1–C5。
- **复用**：C2/C3 全部 OAuth 基建；设置页既有组件范式。
- **计划锚点**：本计划 §五·1。
- **验收**：绑定后可用 KUN 登录同一账号；他人已绑定的 KUN 账号不可重复绑定；未设密码用户解绑被拒并有引导提示。
- **边界**：不做「KUN 端踢人即时生效」（§五·2，需 refresh 持久化 + 单飞锁，独立立项）。

---

**文档版本**：v2（2026-06-11 · 阶段 0 完成标记 / §一 环境变量现状更新 / 新增 §七 会话级执行单元 C1–C6）
