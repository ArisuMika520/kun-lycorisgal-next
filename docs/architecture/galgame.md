# Galgame 条目与资源

本仓库沿用上游命名，**“patch” 指一个 Galgame 条目**。条目相关代码分布在：

| 内容 | 页面 | API | 组件 |
| --- | --- | --- | --- |
| 创建条目 | `app/(main)/edit/create` | `app/api/edit`（POST） | `components/edit/create/` |
| 编辑条目 | `app/(main)/edit/rewrite` | `app/api/edit`（PUT） | `components/edit/rewrite/` |
| 详情页 | `app/(main)/[id]` | `app/api/patch/**` | `components/patch/` |
| 列表与筛选 | `app/(main)/galgame`、`resource` | `app/api/galgame`、`app/api/resource` | `components/galgame/`、`components/resource/` |
| 搜索 | `app/(main)/search` | `app/api/search/**` | `components/search/` |
| 标签 / 会社 | `app/(main)/tag`、`companies`、`company/[id]` | `app/api/tag/**`、`app/api/company/**` | `components/tag/`、`components/company/` |
| 首页 | `app/(main)/page.tsx` | `app/api/home`（`getHomeData`） | `components/home/` |

## 创建条目

仅管理员（`role >= 3`）可创建。流程：

1. 前端 `components/edit/create/CreatePatch.tsx` 收集表单，草稿持久化在
   `store/editStore.ts`（CG 文件经 `persistGameCG.ts` 存 IndexedDB/localforage）。
2. 填写 VNDB ID 时，`VNDBInput.tsx` 调 `POST /api/spider` 从 NextMoe 拉取元数据
   （名称、别名、简介、CG、标签、开发商、相关链接）自动填表，见
   [nextmoe.md](./nextmoe.md#元数据导入)。VNDB ID **选填**；填写时先调
   `GET /api/edit/duplicate` 查重。
3. `POST /api/edit` 以 `multipart/form-data` 提交，`patchCreateSchema`
   （`validations/edit.ts`）校验，别名、标签以 JSON 字符串传输，各最多 100 个。
4. `app/api/edit/create.ts` 在一个 60 秒超时的事务里：
   - 生成 8 位十六进制 `unique_id`；规范化并查重 `vndb_id`；
   - 写 `patch`，上传封面（sharp → AVIF，见 `_upload.ts`）；
   - CG：外链图经 `_rehostImages.ts` 下载并转存到自有图床（已在图床上的地址原样保留），
     上传的文件直接转存；
   - 把 CG 和相关链接追加进 `introduction`，生成约定小节（见下文）；
   - 写别名。
5. 事务外处理标签、会社（`batchTag.ts`、`batchCompany.ts`，不存在则创建并维护计数），
   `content_limit === 'sfw'` 时向 IndexNow 提交新地址。

编辑走 `app/api/edit/update.ts`，规则与创建一致。外部 ID 的规范化和重复报错文案在
`app/api/edit/_externalIds.ts`。

## 简介的约定小节

`introduction` 是 Markdown 原文，但创建流程会写入两个有固定格式的小节，
详情页依赖这个格式做结构化展示：

```markdown
## 游戏截图
![游戏截图](https://图床/patch/123/xxx.avif)

## 相关链接

::kun-link{text="官网" href="https://example.com"}
```

- `components/patch/header/data.ts` 用正则提取这两个小节：截图进入媒体轮播，
  链接进入侧栏，剩余正文单独渲染。只要有一个小节能解析出内容，就启用结构化布局；
  否则整段按原简介渲染。
- 链接只接受站内相对路径和 `http(s)`，其他协议丢弃。
- 修改这两个小节的生成格式时，必须同步修改 `data.ts` 的解析逻辑，并兼容已有数据。

## 详情页

入口 `app/(main)/[id]/page.tsx`（`revalidate = 3`），数据由
`getPatchDetailData(uniqueId)`（`components/patch/header/data.ts`，`react cache`）聚合：

```text
getPatchById            ─┐  Redis patch:<id>，30 秒
getPatchIntroduction    ─┼─ 并行  Redis patch:introduction:<id>，30 秒，已渲染 HTML
prisma 取 dlsite_id     ─┘
        │
        ├─ 解析约定小节 → screenshots / relatedLinks / bodyMarkdown
        ├─ resolveOfficialPurchase（DL 分销，最多等 9 秒，失败返回 null）
        └─ 有购买链接时替换“官网”类链接（rewriteOfficialHrefs）
```

- 展示组件：`PatchDetailPage.tsx` 组装头图、媒体轮播（`PatchDetailMediaCarousel`）、
  侧栏（`PatchDetailRail`，含“支持正版”按钮）、正文 Tabs（`PatchDetailTabs`）。
  样式集中在 `patch-detail.module.css`，背景统一使用深色主题的
  `--heroui-background`，不使用图片、模糊或渐变背景。
- `app/(main)/[id]` 是根级动态段。Next.js 会优先匹配静态路由，所以新增一级路由本身
  不会被它吞掉；但面包屑用 `isPatchPath`（`/^\/[A-Za-z0-9]{8}$/`）判断详情页，
  新增恰好 8 个字母数字的一级路由（如已有的 `/resource`、`/register`、`/redirect`、
  `/settings`）时，必须把它加入 `constants/routes/routes.ts` 的 `pathToIgnore`。
- 浏览量通过 `kunUpdatePatchViewsActions` 单独更新，不影响页面缓存。
- `app/(main)/design/game-detail/` 与 `components/design/` 是详情页设计稿演示路由，
  被 `.gitignore` 忽略、不入库，属于本地开发辅助，正式代码不能依赖它们。

## 资源（下载）

- 模型见 [data-model.md](./data-model.md#patch_resource-关键字段)。`section` 分
  `galgame`（本体，仅管理员）和 `patch`（补丁）；`storage` 分 `lycorisgal`（官方资源盘，
  仅管理员）、`s3`（对象存储）、`user`（自定义链接）。
- 对象存储上传：`POST /api/upload/resource` 校验扩展名（`.zip/.rar/.7z`）、
  大小（≤100MB）、角色（创作者需验证码）、每日 5GB 额度，把文件按哈希写入本地
  `uploads/`，Redis 记 `<hash> → 本地路径`（1 天）。随后
  `POST /api/patch/resource` 发布时按哈希取文件上传 S3 并删除本地副本。
- 发布资源会给用户加 3 萌萌点，并把资源的类型/语言/平台合并写回 `patch`、
  刷新 `resource_update_time`。
- 下载计数：`PUT /api/patch/resource/download` 同事务递增条目和资源的 `download`。
- 资源备注用 `renderMarkdownToHtml` 渲染。

## 评论、收藏与反馈

- 评论：`app/api/patch/comment/**`，`parent_id` 自关联楼中楼，`markdownToHtml` 渲染，
  支持点赞、举报（生成 `report` 消息给管理员）、`@` 提及（`createMentionMessage`）。
- 收藏：用户收藏夹 `user_patch_favorite_folder`，`app/api/patch/favorite`、
  `app/api/user/profile/favorite/**`。
- 反馈：`app/api/patch/feedback` 生成 `feedback` 消息，管理员在 `admin/feedback` 处理。

## Markdown 渲染管线

都在 `app/api/utils/render/`，均使用 unified + `rehype-sanitize`：

| 函数 | 用于 | 额外能力 |
| --- | --- | --- |
| `markdownToHtmlExtend` | 条目简介 | `remark-directive` 指令：`::kun-link`、视频 |
| `markdownToHtml` | 条目评论 | GFM、Prism 代码高亮 |
| `renderMarkdownToHtml` | 话题、话题评论、资源备注 | 自定义 sanitize schema（`protocols` 以属性名为键） |

前两者都经过 `remarkKunExternalLinks` 给链接打 `data-kun-external-link` 标记，前端据此
走外链跳转确认（`app/redirect`，配置来自 `getRedirectConfig`）。新增 HTML 属性或指令时
必须同时放开对应 sanitize 白名单，否则会被静默删除。

## NSFW 过滤

- 前端设置存在 `store/settingStore.ts`，通过 Cookie 持久化，Cookie 名为
  `kun-patch-setting-store|state|data|kunNsfwEnable`。
- 服务端用 `getNSFWHeader` 读这个 Cookie 生成 Prisma `where` 条件：
  缺省 `{ content_limit: 'sfw' }`，`all` 不过滤，其他值按原值过滤。
  Route Handler 用 `app/api/utils/getNSFWHeader.ts`，Server Component 用
  `utils/actions/getNSFWHeader.ts`。
- 列表、搜索、首页、以图识 Gal 都要传入这个条件。新增列表接口时不要漏掉。
