'use server'

import { prisma } from '~/prisma/index'
import { TopicCard } from '~/types/api/topic'

export const getTopicListData = async (): Promise<TopicCard[]> => {
  const topicsData = await prisma.topic.findMany({
    orderBy: [
      {
        is_pinned: 'desc'
      },
      {
        updated: 'desc'
      }
    ],
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
            topic_likes: true
          }
        }
    },
    take: 50
  })

  const topics: TopicCard[] = topicsData.map((topic) => ({
    id: topic.id,
    title: topic.title,
    content: topic.content.slice(0, 150),
    status: topic.status,
    is_pinned: topic.is_pinned,
    view_count: topic.view_count,
    like_count: topic._count.topic_likes,
      comment_count: 0, // TODO: Fix topic_comments count
    created: topic.created.toISOString(),
    updated: topic.updated.toISOString(),
    user: {
      id: topic.user.id,
      name: topic.user.name,
      avatar: topic.user.avatar
    }
  }))

  return topics
}