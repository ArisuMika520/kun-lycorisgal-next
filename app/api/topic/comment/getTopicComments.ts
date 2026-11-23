import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { renderMarkdownToHtml } from '~/app/api/utils/render/renderMarkdownToHtml'
import { visibleAuthorWhere } from '~/app/api/utils/userVisibility'
import type { TopicComment } from '~/types/api/topic-comment'

export const getTopicCommentsSchema = z.object({
  topicId: z.string().transform(Number),
  sortField: z.enum(['created', 'like_count']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('50')
})

const buildOrderBy = (
  sortField: 'created' | 'like_count',
  sortOrder: 'asc' | 'desc'
) => {
  if (sortField === 'like_count') {
    return { like_count: sortOrder } as const
  }

  return { created: sortOrder } as const
}

export const getTopicComments = async (
  input: z.infer<typeof getTopicCommentsSchema>,
  userId?: number
) => {
  const orderBy = buildOrderBy(input.sortField, input.sortOrder)
  // 伪删除 / shadow ban 用户的评论不对他人展示（本人可见）；
  // 被隐藏评论不会进入下一轮 parentIds，其下的回复也随之略去。
  const authorWhere = visibleAuthorWhere(userId)
  type CommentRecord = {
    id: number
    content: string
    like_count: number
    user: {
      id: number
      name: string
      avatar: string
    }
    topic_id: number
    parent_id: number | null
    parent: {
      id: number
      content: string
      created: Date
      updated: Date
      user: {
        id: number
        name: string
        avatar: string
      }
    } | null
    like_by: { id: number }[]
    created: Date
    updated: Date
  }

  const [topLevelComments, total] = await Promise.all([
    prisma.topic_comment.findMany({
      where: {
        topic_id: input.topicId,
        parent_id: null,
        user: authorWhere
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        like_by: {
          where: {
            user_id: userId ?? 0
          },
          select: { id: true }
        }
      },
      orderBy,
      skip: (input.page - 1) * input.limit,
      take: input.limit
    }),
    prisma.topic_comment.count({
      where: {
        topic_id: input.topicId,
        parent_id: null,
        user: authorWhere
      }
    })
  ])

  const rootIds = topLevelComments.map((comment) => comment.id)
  const descendants: CommentRecord[] = []
  let parentIds = rootIds

  while (parentIds.length > 0) {
    const batch = await prisma.topic_comment.findMany({
      where: {
        topic_id: input.topicId,
        parent_id: {
          in: parentIds
        },
        user: authorWhere
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            created: true,
            updated: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        like_by: {
          where: {
            user_id: userId ?? 0
          },
          select: { id: true }
        }
      },
      orderBy
    })

    if (batch.length === 0) {
      break
    }

    descendants.push(...batch)
    parentIds = batch.map((comment) => comment.id)
  }

  const topLevelWithParent: CommentRecord[] = topLevelComments.map(
    (comment) => ({
      ...comment,
      parent: null
    })
  )
  const allComments: CommentRecord[] = [...topLevelWithParent, ...descendants]
  const htmlEntries = await Promise.all(
    allComments.map(
      async (comment) =>
        [comment.id, await renderMarkdownToHtml(comment.content)] as const
    )
  )
  const htmlMap = new Map<number, string>(htmlEntries)
  type CommentNode = CommentRecord & { replies: CommentNode[] }

  const commentMap = new Map<number, CommentNode>(
    allComments.map((comment) => [
      comment.id,
      {
        ...comment,
        replies: []
      }
    ])
  )

  descendants.forEach((comment) => {
    const parent = commentMap.get(comment.parent_id ?? 0)
    const current = commentMap.get(comment.id)
    if (parent && current) {
      parent.replies.push(current)
    }
  })

  const sortReplies = (comments: CommentNode[]) => {
    comments.sort((left, right) => {
      if (input.sortField === 'like_count') {
        return input.sortOrder === 'desc'
          ? right.like_count - left.like_count
          : left.like_count - right.like_count
      }

      const leftTime = left.created.getTime()
      const rightTime = right.created.getTime()
      return input.sortOrder === 'desc'
        ? rightTime - leftTime
        : leftTime - rightTime
    })

    comments.forEach((comment) => {
      if (comment.replies.length > 0) {
        sortReplies(comment.replies)
      }
    })
  }

  const roots = rootIds
    .map((id) => commentMap.get(id))
    .filter((comment): comment is CommentNode => Boolean(comment))
  sortReplies(roots)

  const convertComment = (comment: CommentNode): TopicComment => ({
    id: comment.id,
    content: comment.content,
    contentHtml: htmlMap.get(comment.id) ?? '',
    parentContentHtml: comment.parent
      ? (htmlMap.get(comment.parent.id) ?? '')
      : undefined,
    like_count: comment.like_count,
    user: comment.user,
    topic_id: comment.topic_id,
    parent_id: comment.parent_id,
    parent: comment.parent
      ? {
          id: comment.parent.id,
          content: comment.parent.content,
          created: comment.parent.created.toISOString(),
          updated: comment.parent.updated.toISOString(),
          like_count: 0,
          user: {
            id: comment.parent.user.id,
            name: comment.parent.user.name,
            avatar: comment.parent.user.avatar
          }
        }
      : undefined,
    replies: comment.replies.map(convertComment),
    created: comment.created.toISOString(),
    updated: comment.updated.toISOString(),
    isLiked: comment.like_by.length > 0
  })

  return {
    comments: roots.map(convertComment),
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit)
    }
  }
}
