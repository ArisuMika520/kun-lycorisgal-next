# 安全边界

本文汇总跨模块的安全约束。修改涉及外部请求、用户输入渲染、上传、鉴权或密钥的代码时，
先核对这里的规则。

## 出站请求（SSRF）

由用户输入决定目标地址的服务端请求，必须遵守：

1. 先调用 `utils/ssrfGuard.ts` 的 `guardOutboundUrl(url, { allowHosts })`：
   只允许 `http`/`https`，拒绝带用户名密码的 URL，校验主机白名单，
   **DNS 解析后** 拒绝回环、私网、链路本地（含云元数据 169.254.0.0/16）、组播等地址。
2. `fetch` 使用 `redirect: 'manual'`。要么直接拒绝 3xx，要么手动跟随并对每一跳
   重新执行第 1 步，不能交给 `fetch` 自动跟随。
3. 设置超时（`AbortController` / `AbortSignal.timeout`）和响应体大小上限。

现有调用点：

| 调用点 | 主机白名单 | 上限 |
| --- | --- | --- |
| `app/api/proxy-image` | `utils/imageProxyHosts.ts` | 20MB，仅图片类型，不跟随重定向 |
| `app/api/edit/_rehostImages.ts` | 同上 | 20MB，不跟随重定向 |
| `app/api/identify/fetchImage.ts` | 任意公网主机 | 8MB，最多 3 次重定向 |

新增图片来源时，把主机加进 `IMAGE_PROXY_ALLOW_HOSTS`，不要绕过守卫直接 `fetch`。

## 用户内容渲染

- Markdown 一律在服务端经 `app/api/utils/render/` 的管线转 HTML，管线末端都有
  `rehype-sanitize`。前端 `HtmlContent`、`PatchDetailHtml` 等组件在插入 HTML 前
  再用 `isomorphic-dompurify` 清洗一次。
- 放开新标签或属性时，只放开需要的最小集合；`protocols` 白名单以属性名
  （`href`、`src`）为键。
- 简介中结构化解析出的链接只允许站内路径和 `http(s)`（`components/patch/header/data.ts`
  的 `isSafeHref`）。
- 条目简介和条目评论里的链接带 `data-kun-external-link` 标记，前端替换为
  `components/kun/external-link/ExternalLink.tsx`，按用户设置经 `/redirect?url=` 确认页离站。
  话题使用的 `renderMarkdownToHtml` 不打这个标记。

## 上传

| 入口 | 限制 |
| --- | --- |
| `POST /api/upload/resource` | 登录且 `role >= 2`；扩展名 `.zip/.rar/.7z`；0.001MB～100MB；创作者需人机验证；每日 5GB |
| `POST /api/user/image` | 需登录；普通用户每日 50 张 |
| 条目封面 / CG | 仅管理员；sharp 重新编码为 AVIF，不保留原始文件 |

- 文件名经 `utils/sanitizeFileName.ts`（含 `path.basename` 兜底）处理，防止路径穿越。
- 临时文件只写 `uploads/`，cron 定期清理。

## 鉴权与会话

- 中间件只检查 Cookie 是否存在，所有路由和 actions 必须自行调用 `verifyHeaderCookie`
  并判断角色，不能依赖中间件挡住未授权访问。
- `jwt.verify` 固定 `algorithms: ['HS256']`，并校验 `issuer` 与 `audience`；
  2FA 临时令牌同样固定算法。
- 会话 Cookie 均为 `HttpOnly` + `sameSite: strict`。
- 详见 [auth.md](./auth.md)。

## 密钥与配置

- `.env` 被 Git 忽略。`scripts/postbuild.ts` 会删除 `.next/standalone/` 中的 `.env*`，
  避免把密钥打进构建产物；运行时由 PM2 从项目根 `.env` 注入。
- 只有 `NEXT_PUBLIC_*` 变量可以出现在客户端代码中。`NEXTMOE_API_KEY`、OAuth
  client secret、S3、SMTP、Cloudflare 凭据都只能在服务端使用。
- `JWT_SECRET` 至少 32 位，且不能使用上游公开默认值（启动时校验）。
- Redis 非本机部署时必须设置 `REDIS_PASSWORD`。

## 依赖

- 有已知漏洞的传递依赖通过 `pnpm-workspace.yaml` 的 overrides 锁定到安全版本；
  升级依赖后不要随意删除这些覆盖项。
- Renovate 配置在 `.github/renovate.json`。
