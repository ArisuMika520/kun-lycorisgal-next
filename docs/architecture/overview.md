# 总体架构

LyCorisGAL 是基于 Next.js 15 App Router 的单体应用：页面渲染、HTTP API、
定时任务都运行在同一个 Node 进程里，没有独立后端服务。代码由
[kun-touchgal-next](https://github.com/KUN1007/kun-touchgal-next) 派生，
`package.json` 的 `name`、PM2 应用名 `kun-touchgal-next`、Redis 前缀
`kun:touchgal`、Cookie 名 `kun-galgame-patch-moe-*` 均沿用上游命名，改名会
影响线上会话和缓存，不要顺手重命名。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Next.js 15.5（App Router，`output: 'standalone'`），React 19 |
| 语言 | TypeScript（`strict`），路径别名 `~/*` 与 `@/*` 均指向仓库根 |
| UI | HeroUI 2.8 + Tailwind CSS 4，`next-themes` 深浅色，framer-motion |
| 状态 | zustand（部分 store 持久化到 Cookie，见 [frontend.md](./frontend.md)） |
| 编辑器 | Milkdown（Markdown 所见即所得）+ CodeMirror（源码模式） |
| 数据库 | PostgreSQL **17.0**（生产固定版本）+ Prisma 6.12 |
| 缓存/会话 | Redis（ioredis） |
| 对象存储 | S3 兼容存储（实际为 Cloudflare R2），图片统一转 AVIF |
| 进程管理 | PM2 cluster 模式，2 个实例 |

## 目录分层

| 目录 | 职责 |
| --- | --- |
| `app/(main)/` | 前台页面路由。Galgame 详情页是根级动态段 `app/(main)/[id]`（8 位 `unique_id`） |
| `app/admin/` | 管理后台页面，每个子页面通过同目录 `actions.ts` 取数并校验角色 |
| `app/api/` | Route Handler。业务函数与 `route.ts` 放在同一目录，供页面直接复用 |
| `app/api/utils/` | 后端公共工具：JWT、参数解析、Markdown 渲染、验证码、邮件、OAuth 客户端 |
| `components/` | 按业务域分组的 React 组件；`components/kun/` 是跨业务的基础组件 |
| `lib/` | 外部服务客户端：`redis.ts`、`s3.ts`、`nextmoe/`（DL 分销）、`mdx/`（文档站） |
| `prisma/` | `schema.prisma`、Prisma 单例 `prisma/index.ts`、历史迁移 SQL |
| `validations/` | zod schema，前后端共用；`dotenv-check.ts` 负责环境变量校验 |
| `config/` | 站点信息、广告、友链、缓存时长、功能开关、运行时 JSON 配置 |
| `constants/` | 枚举映射、路由面包屑、邮件模板等静态常量 |
| `store/` | zustand store |
| `types/` | 全局类型声明（`types/api/*.d.ts` 为 API 返回结构，多为全局 ambient 类型） |
| `utils/` | 通用工具：`kunFetch`、SSRF 防护、图片代理、作品标题匹配等 |
| `server/` | 进程内定时任务 `server/tasks/` 与验证码图片素材 `server/image/` |
| `posts/` | 文档站 MDX 源文件，运行时从磁盘读取 |
| `scripts/` | 部署、站点地图、性能采集、数据维护脚本 |
| `tests/` | `node:test` 单元测试 |
| `migration/` | 历史数据迁移与修复脚本，非日常入口 |

## 请求链路

```text
浏览器
 ├─ 页面请求 ──> middleware.ts（只检查 Cookie 是否存在）
 │               └─> app/(main)/**/page.tsx（RSC）
 │                     └─> 同目录 actions.ts（'use server'）
 │                           └─> app/api/**/get.ts 等业务函数 ──> Prisma / Redis
 └─ 客户端交互 ──> utils/kunFetch.ts ──> app/api/**/route.ts
                                         └─> 同一组业务函数 ──> Prisma / Redis / S3 / 外部服务
```

- 页面不通过 HTTP 调自己的 API，而是直接 import `app/api/` 下导出的业务函数
  （例如 `getPatchById`、`getHomeData`）。因此 `app/api/` 下的模块既是 HTTP 入口，
  也是服务端数据层。
- 大部分列表和详情页声明 `export const revalidate = 3`，再叠加 Redis 短 TTL 缓存，
  详见 [api-conventions.md](./api-conventions.md#缓存)。
- 中间件只做“有没有 token”的粗筛，真正的签名、角色校验在路由和 actions 内完成，
  详见 [auth.md](./auth.md)。

## 进程内的后台工作

- `instrumentation.ts`：Node 运行时启动时把全局 undici dispatcher 设为
  IPv4-only。生产服务器没有 IPv6 出站，不能删。axios 请求另由
  `app/api/spider/lib/api/_httpClient.ts` 的 `spiderHttp` 强制 IPv4。
- `server/cron.ts`：由 `app/actions.ts` 在模块加载时引入，`node-cron` 注册
  两个任务：每日 0 点重置用户每日计数；每小时清理 `uploads/` 下超过一天的临时文件。
  PM2 以 2 个实例运行，两个实例都会注册任务，所以任务必须保持幂等。

## 外部依赖一览

| 服务 | 用途 | 入口 |
| --- | --- | --- |
| PostgreSQL 17.0 | 主数据 | `prisma/index.ts` |
| Redis | 会话白名单、验证码、限流、短缓存、运行时配置 | `lib/redis.ts` |
| S3 兼容存储 | 封面、CG、头像、补丁文件 | `lib/s3.ts` |
| SMTP | 验证码与群发邮件 | `app/api/utils/sendVerificationCodeEmail.ts`、`app/api/admin/mail/` |
| NextMoe API | 游戏元数据导入、DL 分销购买链接 | [nextmoe.md](./nextmoe.md) |
| NextMoe·未萌 OAuth | 第三方登录与账号绑定 | [auth.md](./auth.md#nextmoe未萌-oauth) |
| AnimeTrace | 以图识 Gal 的角色识别 | [identify.md](./identify.md) |
| Cloudflare API | 更新封面后清 CDN 缓存 | `app/api/patch/banner/route.ts` |
| IndexNow | 新建条目后通知搜索引擎 | `app/api/edit/_postToIndexNow.ts` |
| Umami | 页面统计脚本，写在 `app/layout.tsx` | — |
