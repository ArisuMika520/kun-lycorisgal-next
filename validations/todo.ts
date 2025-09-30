import { z } from 'zod'

export const todoCreateSchema = z.object({
  title: z
    .string({ required_error: '标题不能为空' })
    .min(1, { message: '标题不能为空' })
    .max(200, { message: '标题长度不能超过 200 个字符' }),
  description: z
    .string()
    .max(2000, { message: '描述长度不能超过 2000 个字符' })
    .optional()
})

export const todoUpdateSchema = z
  .object({
    id: z
      .number({ required_error: '待办 ID 必须为数字' })
      .int({ message: '待办 ID 必须为整数' })
      .positive({ message: '待办 ID 必须大于 0' }),
    title: z
      .string()
      .min(1, { message: '标题不能为空' })
      .max(200, { message: '标题长度不能超过 200 个字符' })
      .optional(),
    description: z
      .string()
      .max(2000, { message: '描述长度不能超过 2000 个字符' })
      .optional(),
    status: z
      .number({ required_error: '状态不能为空' })
      .int({ message: '状态必须为整数' })
      .min(0, { message: '状态只能为 0 或 1' })
      .max(1, { message: '状态只能为 0 或 1' })
      .optional()
  })
  .refine((data) => data.title || data.description || data.status !== undefined, {
    message: '至少需要提供一个更新字段'
  })
