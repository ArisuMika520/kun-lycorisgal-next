# AGENTS.md

本文件是 kun-lycorisgal-next 仓库的项目级协作指引。所有路径均相对仓库根目录。

## 项目目标与当前边界

LyCorisGAL 是面向 Galgame 用户的资源与信息引导站：提供 Galgame 条目资料、
本体与补丁下载资源、标签与会社索引、话题社区、以图识 Gal 和文档教程。
代码由 [kun-touchgal-next](https://github.com/KUN1007/kun-touchgal-next) 派生，
AGPL-3.0 许可。

当前边界：

- **单体应用**：Next.js 15 App Router 同时承担页面、API（`app/api/`）和进程内定时任务，
  没有独立后端。数据层为 PostgreSQL + Prisma，Redis 存会话、验证码、限流与短缓存，
  文件进 S3 兼容存储。
- **命名沿用上游**：“patch” 指一个 Galgame 条目而不是补丁文件；包名、PM2 应用名、
  Redis 前缀 `kun:touchgal`、Cookie 名 `kun-galgame-patch-moe-*` 都是上游遗留，
  改名会让线上会话和缓存失效，不要顺手重命名。
- **生产约束**：PostgreSQL 固定 17.0；`output: 'standalone'` 运行时工作目录是
  `.next/standalone/`；服务器无 IPv6 出站，所有外部请求强制 IPv4；PM2 双实例。
- **外部系统不在本仓库**：NextMoe 元数据/分销 API、NextMoe·未萌 OAuth 服务端、
  AnimeTrace 都是第三方服务，本仓库只实现客户端。OAuth 只做登录与绑定，
  不保存、不刷新第三方 token。
- **非正式功能**：`app/(main)/design/`、`components/design/` 是本地设计稿演示（被 Git 忽略），
  `app/(main)/debug-code/` 是占位页，`migration/` 是一次性脚本，
  `maintenance/` 是独立托管的静态维护页（被 Git 忽略）。

## 协作规则

1. 使用中文沟通和编写项目说明；代码标识符、第三方类名和数据字段保留原名。
2. 修改子系统前先阅读对应的 `docs/architecture/` 文档。改动影响架构、接口、数据字段、运行方式或验证边界时，收尾必须同步文档；没有对应文档则新建。README 只承担项目介绍、环境准备和运行入口，设计细节放入架构文档。
3. 默认不执行 `git commit`。收尾列出本次需要 `git add` 的新文件；提交由用户决定。用户要求提交时，提交信息只用一句简洁概述，不列文件清单，不添加 `Co-Authored-By` 或其他署名行。只有用户明确要求时才能 `git push`。
4. 保持代码文件整洁、职责清楚，实现放在包内模块，不在根目录堆放试验脚本或复制业务逻辑。
5. 编写代码时补充必要的中文注释和文档字符串，解释用途、关键约束和不直观的处理原因。
6. 不一次性编写大段代码。按职责拆成小块，说明具体文件、改动内容和验证结果。

## 常用命令

新增或修改入口时在此登记，并同步 README。

```bash
# 安装依赖（postinstall 会执行 prisma generate）
pnpm install --frozen-lockfile

# 本地开发，监听 127.0.0.1:3000（需要 .env、PostgreSQL、Redis）
pnpm dev                 # Turbopack
pnpm dev:webpack         # Webpack，排查 Turbopack 兼容问题时使用

# 验证
pnpm typecheck                              # 类型检查，当前可通过；构建不会拦截类型错误
pnpm lint --file <path> [--file <path>]     # 只检查改动文件；全仓 pnpm lint 有存量格式错误
pnpm exec tsx --test tests/identify/*.test.ts   # node:test 单元测试，不需要数据库

# Prisma
pnpm prisma:generate     # 重新生成客户端
pnpm prisma:push         # 同步 schema 到数据库（会改库，先确认备份）

# 构建与运行（生产流程见 docs/deployment.md）
pnpm build               # next build + postbuild（生成 sitemap，需要能连数据库）
pnpm start               # PM2 平滑重载 .next/standalone/server.js
pnpm stop

# 专项检查
pnpm db:check-version    # 确认 PostgreSQL 为 17.0
pnpm verify:oauth-wire   # OAuth 线格式自测
pnpm perf:collect        # Lighthouse 性能采集，结果在 perf-results/（不入库）
```

## 架构文档地图

- [总体架构](docs/architecture/overview.md)：技术栈、目录分层、请求链路、外部依赖。首次接触仓库先读。
- [后端与 API 约定](docs/architecture/api-conventions.md)：Route Handler 与 actions 分层、zod 校验、两种错误返回风格、缓存、副作用约定。新增或修改 `app/api/` 前读。
- [认证、会话与权限](docs/architecture/auth.md)：JWT + Redis 白名单、中间件、验证码与 2FA、NextMoe OAuth、角色阈值。涉及登录态或权限时读。
- [数据模型与存储](docs/architecture/data-model.md)：Prisma 模型分组、`patch` 与 `patch_resource` 关键字段、Redis 键空间、对象存储路径。改 schema 或 Redis 键时读。
- [Galgame 条目与资源](docs/architecture/galgame.md)：创建/编辑流程、简介约定小节、详情页数据聚合、资源上传发布、Markdown 渲染管线、NSFW 过滤。改 `edit`、`patch`、列表与搜索时读。
- [NextMoe 集成](docs/architecture/nextmoe.md)：元数据导入（`/api/spider`）与 DL 分销购买链接的解析顺序、缓存和熔断。改 `app/api/spider/`、`lib/nextmoe/` 时读。
- [以图识 Gal](docs/architecture/identify.md)：AnimeTrace 调用、图片链接下载、作品标题匹配与测试。改 `identify` 相关代码时读。
- [前端结构与 UI 约定](docs/architecture/frontend.md)：根布局、导航入口、组件组织、HeroUI/Tailwind、zustand store、编辑器、文档站、图片代理。改页面和组件时读。
- [社区、用户中心与管理后台](docs/architecture/community-admin.md)：话题、消息、关注、用户设置、后台页面与后台设置的存储位置。
- [安全边界](docs/architecture/security.md)：SSRF 守卫、HTML 清洗、上传限制、密钥与依赖覆盖规则。涉及外部请求、用户内容渲染、上传或密钥时必读。
- [运行时、构建与运维](docs/architecture/runtime.md)：环境变量校验、standalone 构建产物与 `RUNTIME_ASSET_DIRS`、PM2 双实例、定时任务、CI 与质量检查现状、辅助脚本。

## 运行、格式与维护文档

- [README](README.md)：项目介绍、环境准备与运行入口。
- [生产部署指南](docs/deployment.md)：系统依赖、PostgreSQL 17.0 安装与恢复、环境变量、构建、PM2、Nginx、更新与备份、常见问题、上线清单。
- [OAuth 接入指南](docs/oauth-integration-guide.md)：NextMoe·未萌 OAuth 协议、PKCE 流程、错误码与排障。
- [OAuth 线格式状态](docs/standard-wire-migration.md)：OAuth 端点当前线格式与生产主机。
- [.env.example](.env.example)：环境变量模板；必填项以 `validations/dotenv-check.ts` 为准。
- 格式规范：Prettier（`.prettierrc.json`）单引号、无分号、2 空格缩进、无尾随逗号；ESLint 配置在 `.eslintrc.json`，CI 见 `.github/workflows/lint-check.yml`。只格式化自己改动的文件，不要全仓执行 `pnpm format`。
- `maintenance/README.md`：迁移期静态维护页说明，目录不入 Git，仅存在于本地工作区。
