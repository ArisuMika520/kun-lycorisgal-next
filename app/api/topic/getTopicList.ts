import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { markdownToText } from '~/utils/markdownToText'
import { topicListSchema } from '~/validations/topic'
import { visibleAuthorWhere } from '~/app/api/utils/userVisibility'
import type { TopicCard } from '~/types/api/topic'

/** 话题列表。viewerUid 用于过滤伪删除 / shadow ban 用户的话题和评论计数（本人可见自己的） */
export const getTopicList = async (
  input: z.infer<typeof topicListSchema>,
  viewerUid: number
) => {
  const { sortField, sortOrder, page, limit, is_pinned } = input
  const authorWhere = visibleAuthorWhere(viewerUid)

  const where: Prisma.topicWhereInput = {
    status: 0,
    user: authorWhere
  }

  if (is_pinned !== undefined) {
    where.is_pinned = is_pinned
  }

  const orderBy: Prisma.topicOrderByWithRelationInput[] = [
    { is_pinned: 'desc' },
    { [sortField]: sortOrder }
  ]

  const [topics, total] = await Promise.all([
    prisma.topic.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            topic_likes: true,
            topic_comments: { where: { user: authorWhere } }
          }
        }
      }
    }),
    prisma.topic.count({ where })
  ])

  const topicCards: TopicCard[] = topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    content: markdownToText(topic.content).slice(0, 200),
    is_pinned: topic.is_pinned,
    view_count: topic.view_count,
    like_count: topic._count.topic_likes,
    comment_count: topic._count.topic_comments,
    user: {
      id: topic.user.id,
      name: topic.user.name,
      avatar: topic.user.avatar
    },
    created: topic.created.toISOString(),
    updated: topic.updated.toISOString()
  }))

  return {
    topics: topicCards,
    total,
    page,
    limit
  }
}
