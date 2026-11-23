import { TopicDetail } from '~/components/topic'
import type { Metadata } from 'next'
import { kunMoyuMoe } from '~/config/moyu-moe'
import { getTopic } from '~/app/api/topic/[id]/getTopic'
import { notFound } from 'next/navigation'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'
import { getTopicComments } from '~/app/api/topic/comment/getTopicComments'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  if (isNaN(id)) {
    return {
      title: `话题不存在 - ${kunMoyuMoe.title}`,
      description: '话题不存在'
    }
  }

  // 传入访问者，使 shadow ban 用户本人打开自己的话题时标题正常
  const payload = await verifyHeaderCookie()
  const topic = await getTopic(id, payload?.uid, false)
  if (!topic) {
    return {
      title: `话题不存在 - ${kunMoyuMoe.title}`,
      description: '话题不存在'
    }
  }

  return {
    title: `${topic.title} - ${kunMoyuMoe.title}`,
    description: topic.content.slice(0, 160)
  }
}

export default async function TopicDetailPage({ params }: Props) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  if (isNaN(id)) {
    notFound()
  }

  const payload = await verifyHeaderCookie()
  const userId = payload?.uid

  const topic = await getTopic(id, userId)
  if (!topic) {
    notFound()
  }

  const commentsResponse = await getTopicComments(
    {
      topicId: id,
      sortField: 'created',
      sortOrder: 'desc',
      page: 1,
      limit: 50
    },
    userId
  )

  return (
    <div className="container mx-auto my-4">
      <TopicDetail
        topic={topic}
        initialComments={commentsResponse.comments}
        initialCommentsTotal={commentsResponse.pagination.total}
      />
    </div>
  )
}
