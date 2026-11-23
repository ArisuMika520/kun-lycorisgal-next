import { z } from 'zod'

export const adminPaginationSchema = z.object({
  page: z.coerce.number().min(1).max(9999999),
  limit: z.coerce.number().min(1).max(100),
  search: z.string().max(300, { message: '搜索内容最多 300 个字符' }).optional()
})

export const adminUpdateUserSchema = z.object({
  uid: z.coerce.number().min(1).max(9999999),
  name: z
    .string()
    .trim()
    .min(1, { message: '您的用户名最少需要 1 个字符' })
    .max(17, { message: '用户名长度不能超过 17 个字符' }),
  role: z.coerce.number().min(1).max(3),
  status: z.coerce.number().min(0).max(2),
  dailyImageCount: z.coerce.number().min(0).max(50),
  bio: z.string().trim().max(107, { message: '签名不能超过 107 个字符' })
})

/**
 * 管理员快捷封禁 / 解封用户（用户主页的管理员操作面板使用）。
 * status 只接受 0（正常）与 2（封禁）；1（限制）尚未实现，不允许通过此接口设置。
 */
export const adminUpdateUserStatusSchema = z.object({
  uid: z.coerce.number().min(1).max(9999999),
  status: z.coerce.number().refine((value) => value === 0 || value === 2, {
    message: '用户状态只能设置为正常或封禁'
  })
})

/** 按 uid 操作单个用户（伪删除、恢复） */
export const adminUserIdSchema = z.object({
  uid: z.coerce.number({ message: '用户 ID 必须为数字' }).min(1).max(9999999)
})

/** 开启 / 解除 shadow ban */
export const adminShadowBanUserSchema = z.object({
  uid: z.coerce.number().min(1).max(9999999),
  enabled: z.boolean()
})

export const approveCreatorSchema = z.object({
  messageId: z.coerce.number().min(1).max(9999999),
  uid: z.coerce.number().min(1).max(9999999)
})

export const declineCreatorSchema = z.object({
  messageId: z.coerce.number().min(1).max(9999999),
  reason: z
    .string()
    .trim()
    .min(1)
    .max(1007, { message: '拒绝理由最多 1007 个字符' })
})

export const adminSendEmailSchema = z.object({
  templateId: z.string(),
  variables: z.record(z.string(), z.string())
})

export const adminHandleFeedbackSchema = z.object({
  messageId: z.coerce.number().min(1).max(9999999),
  content: z
    .string()
    .trim()
    .max(5000, { message: '反馈回复不能超过 5000 个字符' })
})

export const adminHandleReportSchema = z.object({
  messageId: z.coerce.number().min(1).max(9999999),
  content: z
    .string()
    .trim()
    .max(5000, { message: '举报回复不能超过 5000 个字符' })
})

export const adminUpdateRedirectSchema = z.object({
  enableRedirect: z.coerce.boolean(),
  excludedDomains: z.array(
    z.string().max(500, { message: '单个域名最长 500 个字符' })
  ),
  delaySeconds: z.coerce.number()
})

export const adminUpdateDisableRegisterSchema = z.object({
  disableRegister: z.boolean()
})

export const adminUpdateMigrationNoticeSchema = z
  .object({
    enabled: z.coerce.boolean(),
    title: z.string().trim().max(100, { message: '公告标题最多 100 个字符' }),
    content: z
      .string()
      .trim()
      .max(2000, { message: '公告内容最多 2000 个字符' })
  })
  .refine((data) => !data.enabled || (!!data.title && !!data.content), {
    message: '启用公告时, 标题和内容均不能为空'
  })
