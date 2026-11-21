# 以图识 Gal

用户上传截图或填写图片链接，站点调用 AnimeTrace 识别画面中的角色和所属作品，
再把作品名匹配到本站条目。

## 模块

| 文件 | 职责 |
| --- | --- |
| `app/(main)/identify/page.tsx` | 页面入口 |
| `components/identify/IdentifyPage.tsx` | 上传、粘贴、拖拽、链接输入与请求 |
| `components/identify/IdentifyLens.tsx` | 在原图上绘制识别框，裁切角色头像 |
| `components/identify/IdentifyMatches.tsx` | 展示候选作品和匹配到的本站条目 |
| `components/identify/shared.ts` | 前后端一致的类型/大小限制、识别框配色、外部搜索链接等纯函数 |
| `app/api/identify/route.ts` | `POST /api/identify`，编排整个流程 |
| `app/api/identify/fetchImage.ts` | 按链接下载图片，带 SSRF 防护 |
| `app/api/identify/animetrace.ts` | AnimeTrace 客户端与错误码映射 |
| `app/api/identify/matchWorks.ts` | 作品名 → 本站条目 |
| `utils/workSearch.ts` | 标题规范化与相似度打分 |
| `types/api/identify.d.ts` | `IdentifyResult` 等全局类型 |
| `tests/identify/*.test.ts` | 标题匹配与条目匹配的单元测试 |

## 请求流程

```text
POST /api/identify (multipart: file | url)
  ├─ file：校验 ≤8MB，类型 JPG/PNG/WEBP/GIF
  ├─ url ：fetchIdentifyImage
  │        guardOutboundUrl → 手动跟随 ≤3 次重定向（每跳重新校验）
  │        → 15 秒超时、≤8MB、按 Content-Type 或扩展名确定 MIME
  ├─ searchAnimeTrace
  │        模型 ID 从 /v1/model/list 取默认启用模型，Redis 缓存 1 小时
  │        /v1/search（is_multi=1, ai_detect=1），25 秒超时
  │        最多保留 8 个识别结果；业务错误码映射为 400/413/429/503
  └─ matchIdentifyWorks(characters, NSFW 条件)
           失败时不报错，返回 workSearchFailed: true
```

返回 `{ ai, traceId, model, characters, works, workSearchFailed }`。
错误统一为 `{ error }` + HTTP 状态码。

## 作品匹配

- `matchWorks.ts` 在每个进程内维护一份标题索引（条目名 + 全部别名 + 浏览量 +
  `content_limit`），60 秒过期，并发构建时共享同一个 Promise。
- 每次请求取候选作品名去重后最多 12 个，每个作品最多返回 8 个条目。
- **先按 NSFW 条件过滤索引再打分**，取卡片数据时再用同一条件过滤一次，
  避免热门的不匹配条目挤掉精确匹配，也避免越权展示 NSFW 内容。
- `utils/workSearch.ts` 负责全角/半角、标点、大小写的规范化，以及汉字片段、
  拉丁词的部分匹配打分；分数相同时按浏览量、ID 排序。

## 测试

```bash
pnpm exec tsx --test tests/identify/*.test.ts
```

`matchWorks.test.ts` 通过 mock `prisma.patch.findMany` 运行，不需要数据库。
修改标题规范化、打分或过滤逻辑时必须补充或更新这些测试。
