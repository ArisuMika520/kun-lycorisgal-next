import { prisma } from '~/prisma/index'
import { renderMarkdownToHtml } from '~/app/api/utils/render/renderMarkdownToHtml'
import { visibleAuthorWhere } from '~/app/api/utils/userVisibility'
import type { Topic } from '~/types/api/topic'

export const getTopic = async (
  id: number,
  userId?: number,
  incrementView: boolean = true
) => {
  // 伪删除 / shadow ban 用户的话题对他人视为不存在，本人可见
  const topic = await prisma.topic.findUnique({
    where: { id, status: 0, user: visibleAuthorWhere(userId) },
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
      },
      ...(userId && {
        topic_likes: {
          where: { user_id: userId },
          select: { id: true }
        }
      })
    }
  })

  if (!topic) {
    return null
  }

  if (incrementView) {
    await prisma.topic.update({
      where: { id },
      data: { view_count: { increment: 1 } }
    })
  }

  const contentHtml = await renderMarkdownToHtml(topic.content)

  const result: Topic = {
    id: topic.id,
    title: topic.title,
    content: topic.content,
    contentHtml,
    status: topic.status,
    is_pinned: topic.is_pinned,
    view_count: incrementView ? topic.view_count + 1 : topic.view_count,
    like_count: topic._count.topic_likes,
    user: topic.user,
    created: topic.created,
    updated: topic.updated,
    isLiked: userId ? topic.topic_likes.length > 0 : false
  }

  return result
}
