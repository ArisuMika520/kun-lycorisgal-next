# 运行时、构建与运维

部署操作步骤见 [生产部署指南](../deployment.md)。本文只解释这些步骤背后的结构约束。

## 环境变量

- `validations/dotenv-check.ts` 定义必填 schema，在 `next.config.ts` 加载时执行，
  缺失或格式错误会直接中断 dev / build。`scripts/deployBuild.ts` 也用同一 schema 预检。
- 新增 **必填** 环境变量时：加到 `envSchema`、`.env.example`、部署文档三处；
  CI 用 `.env.example` 充当 `.env`，示例值必须能通过校验。
- 可选变量（OAuth、`NEXTMOE_API_KEY`、`REDIS_PASSWORD`、`KUN_VISUAL_NOVEL_TEST_SITE_LABEL`）
  直接 `process.env` 读取，代码必须处理缺失的情况。
- `NEXT_PUBLIC_*` 会在构建时内联进客户端包，修改后必须重新构建。

## 构建产物

```text
pnpm build
 ├─ next build                 output: 'standalone'
 └─ postbuild (scripts/postbuild.ts)
     ├─ pnpm build:sitemap     连接数据库生成 public/sitemap.xml（只含 sfw 条目与文档）
     ├─ 拷贝 public/、.next/static/ 到 .next/standalone/
     ├─ 拷贝运行时读盘目录 posts/、config/、server/image/ 到 .next/standalone/
     └─ 删除 .next/standalone/.env*
```

- standalone 的 `server.js` 启动时会 `process.chdir` 到 `.next/standalone/`，
  所以运行时所有 `process.cwd()` 相对路径都指向构建产物目录。
  **新增需要在运行时从磁盘读取的目录，必须加进 `postbuild.ts` 的 `RUNTIME_ASSET_DIRS`**，
  否则生产环境 ENOENT。
- 同理，生产环境中上传临时目录和 cron 清理的 `uploads/` 实际位于
  `.next/standalone/uploads/`，而不是仓库根的 `uploads/`；重新构建会清空 `.next/`。
- `next.config.ts` 设置了 `eslint.ignoreDuringBuilds` 和 `typescript.ignoreBuildErrors`，
  构建 **不会** 拦截类型或 lint 错误，必须单独运行 `pnpm typecheck`。
- `serverExternalPackages` 包含 `jsdom`、`isomorphic-dompurify`（standalone 下
  `__dirname` 被改写会找不到静态资源）；webpack externals 包含 `undici`
  （供 `instrumentation.ts` 使用）。不要移除。
- 构建会生成 sitemap，因此构建环境需要能连上数据库。

## 进程模型

- `ecosystem.config.cjs`：PM2 应用名 `kun-touchgal-next`，`cluster` 模式 2 个实例，
  内存超过 2G 自动重启；运行 `.next/standalone/server.js`，默认监听 `127.0.0.1:3000`，
  由 Nginx 反代。环境变量从项目根 `.env` 读取后注入。
- `pnpm start` = `pm2 startOrReload ecosystem.config.cjs --update-env`，平滑重载。
- 两个实例各有一份进程内状态：
  - `node-cron` 任务两边都会执行（每日重置、每小时清理），必须幂等；
  - 以图识 Gal 标题索引、NextMoe 单飞与熔断的内存部分是进程级的；
    需要跨实例共享的状态必须放 Redis。

## 定时任务

| 任务 | 文件 | 周期 | 内容 |
| --- | --- | --- | --- |
| 每日重置 | `server/tasks/resetDailyTask.ts` | `0 0 * * *` | 清零所有用户的 `daily_image_count`、`daily_check_in`、`daily_upload_size` |
| 临时文件清理 | `server/tasks/setCleanupTask.ts` | `0 * * * *` | 删除 `uploads/` 下 `ctime` 超过 24 小时的文件和空目录 |

任务在 `app/actions.ts` 被加载时通过模块副作用注册（`server/cron.ts`）。
新增任务放到 `server/tasks/`，并在 `server/cron.ts` 引用。

## 网络

- 生产服务器无 IPv6 出站。`instrumentation.ts` 把全局 undici dispatcher 固定为 IPv4；
  axios 只能使用 `spiderHttp`。新增外部 HTTP 客户端时同样要强制 IPv4。

## 质量检查与 CI

- `.github/workflows/lint-check.yml`：在 push / PR 到 `main` 时，用 Node 22.18.0、
  `pnpm install --frozen-lockfile`、复制 `.env.example`、`prisma:generate`，
  然后执行 `pnpm lint` 和 `pnpm typecheck`。
- 现状：`pnpm typecheck` 可通过；`pnpm lint` 在存量代码上有大量 `prettier/prettier`、
  `sort-imports` 报错，整体不通过。修改代码时用 `pnpm lint --file <path>` 检查改动文件，
  不要顺手全仓格式化。
- 单元测试使用 `node:test`，通过 `tsx` 运行（见 [identify.md](./identify.md#测试)）。

## 辅助脚本与目录

| 位置 | 用途 |
| --- | --- |
| `scripts/deployInstall.ts`、`deployBuild.ts` | 部署自动化（`pnpm deploy:install`、`deploy:build`） |
| `scripts/checkPostgresVersion.ts` | 确认数据库为 PostgreSQL 17.0 |
| `scripts/restorePostgres17.sh` | 恢复 17.0 备份 |
| `scripts/generateKunSitemap.ts` | 站点地图 |
| `scripts/update-companies.ts` | 用 NextMoe 批量回填会社 |
| `scripts/unban-local-ip.ts` | 本地开发解除 `127.0.0.1` 注册封禁 |
| `scripts/verifyKunOAuthWire.ts` | OAuth 线格式自测 |
| `scripts/perf/` | Lighthouse 性能采集与对比（`pnpm perf:*`），结果写 `perf-results/`（不入库） |
| `migration/` | 历史迁移与修复脚本，一次性使用 |
| `maintenance/` | 迁移期间托管在 Cloudflare Pages 的纯静态维护页，被 Git 忽略，说明见其 README |
