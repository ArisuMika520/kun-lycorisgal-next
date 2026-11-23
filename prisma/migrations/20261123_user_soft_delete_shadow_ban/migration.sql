-- 用户伪删除与 shadow ban。两列均可空，NULL 表示未删除 / 未 shadow ban，不影响已有数据。
-- delete_time：管理员伪删除用户的时间，账号无法登录且内容对所有人隐藏，置 NULL 即恢复。
-- shadow_ban_time：管理员 shadow ban 用户的时间，内容只对本人和管理员可见。
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "delete_time" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "shadow_ban_time" TIMESTAMP(3);
