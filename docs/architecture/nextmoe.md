# NextMoe 集成：元数据导入与 DL 分销

站点通过 NextMoe 公共 API（`https://api.nextmoe.dev`）做两件事：
创建条目时导入游戏元数据，以及在详情页生成 DLsite 分销购买链接。
OAuth 登录虽然也属于 NextMoe（`account.nextmoe.com`），但是独立体系，见
[auth.md](./auth.md#nextmoe未萌-oauth)。

## 密钥规则

`NEXTMOE_API_KEY` 是可选的服务端密钥：

- 必须以 `nmk_` 开头。非 `nmk_` 值：元数据导入直接报错，分销模块视为未配置；都不会发出去。
- 只在服务端读取，禁止加 `NEXT_PUBLIC_` 前缀或传给客户端组件。
- 铸造分销短链需要密钥带 `store:read` scope。
- 不在 `dotenv-check.ts` 的必填项里，缺失不影响启动。

## 元数据导入

| 项 | 位置 |
| --- | --- |
| 接口 | `POST /api/spider`，body `{ vndbId }`，仅管理员 |
| 实现 | `app/api/spider/lib/api/nextmoe.ts` 的 `fetchNextMoeMetadata`（`spider-service.ts` 只是转发） |
| HTTP 客户端 | `spiderHttp`（axios，强制 IPv4） |
| 前端 | `components/edit/create/VNDBInput.tsx`、`components/edit/rewrite/VNDBInput.tsx` |
| 批量脚本 | `scripts/update-companies.ts`：按已有条目的 VNDB ID 回填会社，429 时重试 |

流程：`/v2/catalog/works?refs=vndb:<id>&nsfw=true` 查目录 ID →
`/v2/catalog/works/<id>` 取详情 → `mapNextMoeWork` 映射成 `SpiderMetadata`
（名称、简介、发售日、别名、标签、封面、截图、官网、`contentLimit`、会社）。
有密钥时带 `Authorization: Bearer`，没有则匿名请求。

错误通过 `NextMoeError(status, body)` 抛出，路由原样转给前端；其他异常返回 502。
旧的 VNDB / Bangumi / Steam / DLsite / TouchGal 直连爬虫已在 `9339398` 中移除，
元数据目前只来自 NextMoe。

## DL 分销购买链接

| 文件 | 职责 |
| --- | --- |
| `lib/nextmoe/purchaseLink.ts` | 调 API、缓存、熔断、单飞；对外只导出 `resolveOfficialPurchase` |
| `lib/nextmoe/affiliateUrl.ts` | 纯函数：商品号规范化、官网链接识别、语言排序、HTML 链接替换 |
| `components/patch/header/data.ts` | 详情页调用入口 |
| `components/patch/header/PatchDetailRail.tsx` | “支持正版”按钮展示 |

### 解析顺序

`resolveOfficialPurchase({ dlsiteId, vndbId, officialHrefs })`：

1. 没有可用密钥或处于熔断期 → 返回 `null`（页面保持原官网链接）。
2. 条目有 `dlsite_id` → 直接用这个商品号铸造。
3. 简介里标为“官网”的链接（`官网`、`官方网站`、`official site` 等标签）本身是
   DLsite 商品页 → 用其中的商品号（`RJ`/`VJ` + 6～8 位数字）。
4. 有 VNDB ID → 目录反查该作品的 DLsite 候选商品；多个候选时结合发行语言
   （简体中文优先，其次中文、繁中、日文）和报价状态排序后铸造。
5. 都没有 → `null`。

铸造调用 `/v2/store/purchase-links/<productId>`，成功得到 `s.imoe.uk` 短链。
`data.ts` 再用 `rewriteOfficialHrefs` 把简介 HTML 与侧栏里所有“官网”链接替换为短链。

### 降级与缓存

整个解析有 9 秒页面预算，单次 HTTP 3 秒超时，Redis 读写 500 毫秒超时；
任何失败都返回 `null`，**不能让详情页报错**。

| 情况 | 处理 |
| --- | --- |
| 铸造成功 | `nextmoe:purchase:<productId>` 缓存 1 小时 |
| 商品 404 | 记未命中 6 小时 |
| 其他错误 | 记未命中 1 分钟 |
| VNDB 候选 | `nextmoe:dlsite-candidates:<vndbId>` 缓存 1 天（空结果 6 小时） |
| 401 / 凭证无效 | 全站暂停铸造 15 分钟 |
| 403 | 暂停 6 小时 |
| 429 | 按 `Retry-After` 暂停（配额耗尽最长 1 天，普通限流最长 15 分钟） |

暂停状态同时记在进程内存和 Redis `nextmoe:purchase:halt`，多个 PM2 实例共享。
同一参数的并发请求在进程内单飞合并（`singleFlight`）。
