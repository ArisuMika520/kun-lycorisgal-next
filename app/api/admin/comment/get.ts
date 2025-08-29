import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { adminPaginationSchema } from '~/validations/admin'
import { markdownToText } from '~/utils/markdownToText'
import type { AdminComment } from '~/types/api/admin'

export const getComment = async (
  input: z.infer<typeof adminPaginationSchema>
) => {
  const { page, limit, search } = input
  const offset = (page - 1) * limit

  const where = search
    ? {
        content: {
          contains: search,
          mode: 'insensitive' as const
        }
      }
    : {}

  // 获取Galgame评论
  const [patchComments, patchTotal] = await Promise.all([
    prisma.patch_comment.findMany({
      where,
      orderBy: { created: 'desc' },
      include: {
        patch: {
          select: {
            name: true,
            unique_id: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            like_by: true
          }
        }
      }
    }),
    prisma.patch_comment.count({ where })
  ])

  // 获取话题评论
  const [topicComments, topicTotal] = await Promise.all([
    prisma.topic_comment.findMany({
      where,
      orderBy: { created: 'desc' },
      include: {
        topic: {
          select: {
            title: true,
            id: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            like_by: true
          }
        }
      }
    }),
    prisma.topic_comment.count({ where })
  ])

  // 合并并转换评论数据
  const allComments: AdminComment[] = [
    ...patchComments.map((comment) => ({
      id: comment.id,
      uniqueId: comment.patch.unique_id,
      user: comment.user,
      content: markdownToText(comment.content).slice(0, 233),
      patchName: comment.patch.name,
      patchId: comment.patch_id,
      like: comment._count.like_by,
      created: comment.created,
      type: 'patch' as const
    })),
    ...topicComments.map((comment) => ({
      id: comment.id,
      uniqueId: `topic-${comment.topic.id}`,
      user: comment.user,
      content: markdownToText(comment.content).slice(0, 233),
      patchName: comment.topic.title,
      patchId: comment.topic_id,
      like: comment._count.like_by,
      created: comment.created,
      type: 'topic' as const
    }))
  ]

  // 按创建时间排序
  allComments.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())

  // 分页处理
  const total = patchTotal + topicTotal
  const paginatedComments = allComments.slice(offset, offset + limit)

  return { comments: paginatedComments, total }
}
