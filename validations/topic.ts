import { z } from 'zod'

// 创建话题验证
export const createTopicSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
  content: z.string().min(1, '内容不能为空').max(50000, '内容不能超过50000个字符')
})

// 获取话题列表验证
export const topicListSchema = z.object({
  sortField: z.union([z.literal('created'), z.literal('view_count'), z.literal('like_count')]).default('created'),
  sortOrder: z.union([z.literal('asc'), z.literal('desc')]).default('desc'),
  page: z.coerce.number().min(1).max(9999999).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  is_pinned: z.coerce.boolean().optional() // 修改为is_pinned以匹配数据库字段
})

// 更新话题验证
export const updateTopicSchema = z.object({
  id: z.coerce.number().min(1),
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符').optional(),
  content: z.string().min(1, '内容不能为空').max(50000, '内容不能超过50000个字符').optional(),
  is_pinned: z.boolean().optional()
})

// 话题点赞验证
export const topicLikeSchema = z.object({
  topicId: z.coerce.number().min(1)
})