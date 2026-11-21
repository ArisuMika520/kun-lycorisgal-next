# 前端结构与 UI 约定

## 布局

`app/layout.tsx` 是唯一的根布局：

```text
<Providers>            app/providers.tsx：进度条（@bprogress/next）→ HeroUIProvider → next-themes
  KunTopBar            components/kun/top-bar/：品牌、搜索、NSFW 切换、主题、用户菜单、消息铃铛
  AppShell             components/layout/：左侧 Sidebar + 内容区 + KunFooter
  KunBackToTop
  LazySnow             雪花特效，受 config/featureFlags.ts 的 ENABLE_SNOW 控制
  LazyMigrationNotice  迁移公告弹窗，内容由后台配置（/api/setting/migration-notice）
```

- `app/admin/layout.tsx` 在根布局内再套一层后台侧栏。
- 导航入口有两处：桌面侧栏 `components/layout/Sidebar.tsx`（含广告位），
  移动端菜单 `constants/top-bar.ts` 的 `kunMobileNavItem`。新增页面需要入口时两处都要改。
- 面包屑由 `components/kun/NavigationBreadcrumb.tsx` 根据 `constants/routes/` 生成。
- 站点名、关键词、域名等 SEO 信息集中在 `config/site.ts`（导出 `kunMoyuMoe`），
  页面 metadata 一般写在同目录 `metadata.ts`。测试站设置了
  `KUN_VISUAL_NOVEL_TEST_SITE_LABEL` 时，`app/metadata.ts` 会关闭搜索引擎索引。

## 组件组织

- `components/<业务域>/`：与路由同名的业务组件，如 `patch`、`edit`、`topic`、`admin`。
- `components/kun/`：跨业务的基础组件（分页、Markdown/HTML 渲染、图片查看器、
  头像卡片、验证码、裁剪器、Milkdown 编辑器、外链跳转等）。新增通用组件放这里。
- 页面 `page.tsx` 是 Server Component，负责取数和 metadata；交互放在
  `'use client'` 组件里。客户端组件不要 import `prisma`、`lib/redis`、`lib/s3`
  或读取非 `NEXT_PUBLIC_` 环境变量。

## 样式

- Tailwind CSS 4，入口 `styles/index.css` → `styles/tailwindcss.css`，
  通过 `@plugin './hero.ts'` 加载 HeroUI 主题，主色 `#f791a9`。
- HeroUI 组件按包单独引入（`@heroui/button`、`@heroui/card` 等），版本在
  `package.json` 中精确锁定。`tailwindcss.css` 的 `@source` 指向
  `node_modules/@heroui/theme/dist`，pnpm 依赖布局变化导致样式缺失时先查这里。
- 深色模式使用 `class` 策略（`@custom-variant dark`）。
- 复杂页面使用 CSS Modules（如 `components/patch/header/patch-detail.module.css`、
  `components/identify/identify.module.css`），文章排版样式在 `styles/prose.css`、
  `styles/blog.css`。

## 客户端状态

| Store | 持久化 | 用途 |
| --- | --- | --- |
| `userStore` | localStorage `kun-patch-user-store` | 当前用户信息与外链跳转配置。只用于展示，权限以服务端为准 |
| `settingStore` | **Cookie**（`store/_cookie.ts`） | NSFW 设置。服务端读取同名 Cookie 过滤内容，见 [galgame.md](./galgame.md#nsfw-过滤) |
| `editStore` | localStorage | 创建条目草稿；CG 文件另存 localforage |
| `rewriteStore` | 否 | 编辑条目表单 |
| `searchStore`、`breadcrumb` | localStorage | 搜索选项、面包屑 |
| `topicStore`、`milkdownStore` | 否 | 话题与编辑器临时状态 |

`store/_cookie.ts` 会把嵌套对象展开为 `<store>|state|data|<key>` 形式的多个 Cookie。
修改 `settingStore` 的结构会改变 Cookie 名，服务端 `getNSFWHeader` 需同步修改。

## 编辑器

- `components/kun/milkdown/`：Milkdown（`@milkdown/core` + commonmark/GFM 预设，
  history、clipboard、upload、prism、listener 等插件）与 CodeMirror 源码模式双编辑器，
  `DualEditorProvider` 负责切换和同步，条目编辑和话题编辑都在用。
- 编辑器内容是 Markdown，最终由服务端渲染管线转成 HTML，见
  [galgame.md](./galgame.md#markdown-渲染管线)。

## 文档站（/doc）

- 源文件在 `posts/<分类>/*.mdx`，frontmatter 由 `gray-matter` 解析，
  `lib/mdx/getPosts.ts` 在运行时从磁盘读取。
- `app/(main)/doc/[...slug]` 用 `generateStaticParams` 预生成，渲染使用
  `next-mdx-remote/rsc` 和 `lib/mdx/CustomMDX.tsx` 中的自定义元素。
- standalone 部署时 `posts/` 必须随构建拷贝，见 [runtime.md](./runtime.md#构建产物)。

## 图片

- 业务图片放在自有图床（`KUN_VISUAL_NOVEL_IMAGE_BED_URL`）。`next.config.ts` 的
  `images.remotePatterns` 只放行图床主机和 `img.touchgalstatic.org`。
- `r2.lycorisgal.com` 的图片经 `utils/imageProxy.ts` 改写为 `/api/proxy-image?url=...`，
  由服务端代理并补正 `Content-Type`（R2 对 AVIF/WebP 常返回
  `application/octet-stream`）。代理白名单见 `utils/imageProxyHosts.ts`。

## 开发辅助路由

- `app/(main)/design/game-detail/`（及 `components/design/`）：详情页设计稿演示，被 `.gitignore`
  忽略、不入库，只存在于本地开发环境。正式代码不能 import 这些目录。
- `app/(main)/debug-code/`：占位页面。
- 二者都不是正式功能，不要在导航中暴露。
