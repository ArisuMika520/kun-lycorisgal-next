# 社区、用户中心与管理后台

## 社区功能

| 功能 | 页面 | API | 说明 |
| --- | --- | --- | --- |
| 话题 | `app/(main)/topic/**` | `app/api/topic/**` | 论坛帖，支持置顶、点赞、评论楼中楼、举报；内容用 `renderMarkdownToHtml` 渲染 |
| 评论流 | `app/(main)/comment` | `app/api/comment` | 全站最新条目评论 |
| 站内消息 | `app/(main)/message/**` | `app/api/message/**` | 分 `notice`、`mention`、`follow`、`system` 页签；未读数供顶栏铃铛使用 |
| 关注 | 用户主页 | `app/api/user/follow/**` | `user_follow_relation`，关注时发 `follow` 消息 |
| `@` 提及 | 评论输入框 | `app/api/user/mention/search` | 发评论时由 `createMentionMessage` 生成 `mention` 消息 |
| 友链 | `app/friend-link` | — | 数据来自 `config/friend.json` / `config/friend.ts` |
| 公开待办 | `app/(main)/todo` | `GET /api/todo` | 只读、无需登录，展示 `admin_todo`。与后台共用 `app/api/admin/todo/get.ts` 的 `getTodoList`；不能放在 `/api/admin` 下，因为中间件会拦截不带会话 Cookie 的请求 |
| 文档 | `app/(main)/doc/**` | — | `posts/` 下的 MDX，见 [frontend.md](./frontend.md#文档站doc) |

## 用户中心

- 个人主页 `app/(main)/user/[id]/**`：资源、评论、收藏夹三个分页，数据来自
  `app/api/user/profile/**`。浮动用户卡片数据来自 `app/api/user/profile/floating`。
- 设置页 `app/(main)/settings/user`：头像（裁剪后上传）、用户名、简介、邮箱、密码、
  邮件通知、2FA、OAuth 绑定/解绑，对应 `app/api/user/setting/**`。
- 签到 `app/api/user/status/check-in`：每日一次，随机增加 1～7 萌萌点。
- `GET /api/user/status` 返回当前登录用户信息，前端据此刷新 `userStore`。
- 创作者申请：`app/apply/**` 与 `app/api/apply/**`，提交后生成 `apply` 消息，
  管理员在后台审批，详见 [auth.md](./auth.md#角色与状态)。

## 管理后台

页面在 `app/admin/**`，API 在 `app/api/admin/**`。每个页面的 `actions.ts`
都会重新校验 `role >= 3`，API 侧由中间件先拦截无 Cookie 请求，再由路由校验角色。

| 页面 | 职责 |
| --- | --- |
| `admin`（首页） | 统计概览，`app/api/admin/stats/**` |
| `admin/galgame`、`resource`、`comment`、`topic` | 内容管理（编辑、删除） |
| `admin/user` | 用户管理。修改用户信息会吊销其会话；永久删除（仅超级管理员）会写入禁止重新注册的 Redis 键并吊销会话 |
| `admin/creator` | 创作者申请审批（`approve` / `decline`） |
| `admin/feedback`、`report` | 处理用户反馈与举报，处理结果以消息通知用户 |
| `admin/email` | 群发邮件，模板在 `constants/email/group-templates.ts` 与 `constants/email/templates/` |
| `admin/log` | `admin_log` 审计日志 |
| `admin/todo` | 后台待办（`/api/admin/todo`，读写均需管理员），同一数据经 `GET /api/todo` 在 `/todo` 公开展示 |
| `admin/setting` | 注册开关、外链跳转配置、迁移公告 |

后台设置的存储方式：

| 设置 | 存储 | 读取方 |
| --- | --- | --- |
| 关闭注册 | Redis `admin:setting:register` | `send-register-code` |
| 外链跳转（开关、白名单域名、延迟） | Redis `admin:config:redirect`，缺失时回源 `config/redirect.json` | 登录返回值、`ExternalLink` |
| 迁移公告 | Redis（`app/api/admin/setting/migration-notice/getMigrationNotice.ts`） | `/api/setting/migration-notice` → `LazyMigrationNotice` |

有数据变更的后台操作要写 `admin_log`，见 [api-conventions.md](./api-conventions.md#副作用约定)。
