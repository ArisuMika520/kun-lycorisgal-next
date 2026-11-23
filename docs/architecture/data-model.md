# 数据模型与存储

## Schema 管理

- 唯一事实来源是 `prisma/schema.prisma`。表名与字段名保持 snake_case，
  Prisma 模型名即表名（`patch`、`user_message` 等），代码里直接使用这些字段名。
- 部署通过 `pnpm prisma:push`（`prisma db push`）同步 schema，**不走**
  `prisma migrate deploy`。`prisma/migrations/` 下的 SQL 只是变更记录，便于在已有
  数据库上人工执行或审查。新增结构变更时同时补一份迁移 SQL。
- `postinstall` 会执行 `prisma generate`；CI 也会单独执行 `pnpm prisma:generate`。
- 生产 PostgreSQL 固定为 17.0，`pnpm db:check-version` 在部署前强制检查。

## 领域划分

“patch” 在本仓库指 **一个 Galgame 条目**（沿用上游“补丁站”命名），不是补丁文件。
补丁文件、游戏本体下载都属于 `patch_resource`。

| 领域 | 模型 | 说明 |
| --- | --- | --- |
| 用户 | `user` | 角色 `role`、状态 `status`、萌萌点 `moemoepoint`、每日计数（`daily_*`，每天 0 点由 cron 清零）、2FA 字段；`delete_time`（伪删除）、`shadow_ban_time`（shadow ban）为可空时间，NULL 表示未处于该状态，见 [community-admin.md](./community-admin.md#用户内容可见性) |
| | `user_oauth_account` | 第三方账号绑定，`(provider, provider_user_id)` 唯一，当前 provider 为 `kun-oauth` |
| | `user_follow_relation` | 关注关系 |
| | `user_message` | 站内通知，`type` 取值见 `constants/message.ts`，`status` 0 未读 |
| Galgame 条目 | `patch` | 核心表，见下节 |
| | `patch_alias` | 别名，参与搜索和以图识 Gal 标题匹配 |
| | `patch_tag` / `patch_tag_relation` | 标签及多对多关系，`patch_tag.count` 为冗余计数 |
| | `patch_company` / `patch_company_relation` | 会社（开发商）及多对多关系，`count` 为冗余计数 |
| | `patch_resource` | 下载资源，见下节 |
| | `patch_comment` | 条目评论，`parent_id` 自关联形成楼中楼 |
| | `user_patch_favorite_folder(_relation)` | 收藏夹及收藏关系，每用户上限见 `config/user.ts` |
| | `user_patch_comment_like_relation`、`user_patch_resource_like_relation` | 点赞关系 |
| 社区 | `topic`、`topic_comment`、`topic_like`、`topic_comment_like` | 论坛话题，`like_count` 为冗余计数 |
| 管理 | `admin_log`、`admin_todo` | 管理操作日志、后台待办 |

所有关系外键都是 `onDelete: Cascade`（`admin_todo.user_id` 为 `SetNull`），
物理删除用户会级联删除其创建的条目、资源和评论。因此后台的“删除用户”是伪删除，
只写 `user.delete_time`，应用代码中没有物理删除用户的入口。

## `patch` 关键字段

| 字段 | 约束 |
| --- | --- |
| `unique_id` | 8 位十六进制（`crypto.randomBytes(4)`），**唯一**，同时是详情页 URL `/<unique_id>` |
| `vndb_id` | 可空。写入前经 `utils/vndbId.ts` 规范化为 `v<数字>`；创建时按大小写不敏感检查重复，但数据库层不唯一 |
| `dlsite_id` | 可空，非唯一（`20260320_relax_patch_external_id_unique`）。用于 DL 分销购买链接 |
| `banner` | 封面 URL，指向图床 `.../patch/<id>/banner/banner.avif` |
| `introduction` | Markdown 原文，最长 100007 字符。约定的 `## 游戏截图`、`## 相关链接` 小节会被详情页结构化解析，见 [galgame.md](./galgame.md#详情页) |
| `content_limit` | `sfw` / `nsfw`，配合 NSFW 设置过滤列表 |
| `type` / `language` / `platform` / `engine` | 字符串数组，前三者的取值与中文映射在 `constants/resource.ts`，由资源发布时汇总写回 |
| `download` / `view` | 冗余计数，用 `increment` 更新 |
| `resource_update_time` | 资源最近创建/更新时间，Galgame 列表可按它排序（`validations/galgame.ts`） |

## `patch_resource` 关键字段

| 字段 | 说明 |
| --- | --- |
| `section` | `galgame`（游戏本体，仅管理员）或 `patch`（补丁） |
| `storage` | `lycorisgal`（官方资源盘，仅管理员）、`s3`（对象存储，创作者以上）、`user`（自定义链接） |
| `content` | 下载地址；`s3` 类型为 `NEXT_PUBLIC_KUN_VISUAL_NOVEL_S3_STORAGE_URL/patch/<id>/resource/<hash>/<文件名>` |
| `hash` | `s3` 上传时的文件哈希，用于定位临时文件 |
| `code` / `password` | 提取码、解压密码 |

## Redis 键空间

`lib/redis.ts` 给所有键加前缀 `kun:touchgal:`。下表省略前缀：

| 键 | TTL | 用途 |
| --- | --- | --- |
| `access:token:<uid>` | 30 天 | 会话白名单 |
| `captcha:generate:<session>` / `captcha:verify:<code>` | 短期 | 人机验证 |
| `<email>` | 10 分钟 | 邮件验证码 |
| `limit:email:<email>`、`limit:ip:<ip>` | 60 秒 | 验证码发送限流 |
| `admin:setting:register` | 永久 | 关闭注册开关 |
| `admin:delete:user:<email/ip>` | 永久 | 被删除用户的邮箱与注册 IP 禁止重新注册（邮箱注册与 OAuth 建号都检查），恢复用户时删除 |
| `admin:config:redirect` | 1 天 | 外链跳转配置，回源 `config/redirect.json` |
| `patch:<uniqueId>`、`patch:introduction:<uniqueId>` | 30 秒 | 详情数据短缓存（`config/cache.ts`） |
| `<fileHash>` | 1 天 | 已上传临时文件路径，发布资源时取用 |
| `nextmoe:purchase:<productId>`、`nextmoe:dlsite-candidates:<vndbId>`、`nextmoe:purchase:halt` | 1 分钟～1 天 | DL 分销购买链接、候选商品、熔断标记，见 [nextmoe.md](./nextmoe.md) |
| `animetrace:model` | 1 小时 | AnimeTrace 默认模型 ID |

多个站点共用一台 Redis 时，前缀相同会互相串数据，部署时注意隔离
（参见 OAuth 指南 4.3 节）。

## 对象存储与本地文件

- `lib/s3.ts` 封装 PutObject / DeleteObject，Bucket 由环境变量决定。
- 图片在服务端用 sharp 转 AVIF 后上传：封面生成 `banner.avif`（≤1920×1080）
  与 `banner-mini.avif`（≤460×259）；CG 由 `app/api/edit/_upload.ts` 写到
  `patch/<id>/` 下。图片公开地址以 `KUN_VISUAL_NOVEL_IMAGE_BED_URL` 为前缀。
- 资源文件先落到本地 `uploads/`，发布资源时再上传 S3 并删除本地目录；
  `uploads/` 中超过 24 小时的残留由 cron 每小时清理。`uploads/` 不入库。
