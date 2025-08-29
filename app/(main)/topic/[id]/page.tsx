import { TopicDetail } from '~/components/topic'
import type { Metadata } from 'next'
import { kunMoyuMoe } from '~/config/moyu-moe'
import { getTopic } from '~/app/api/topic/[id]/route'
import { notFound } from 'next/navigation'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { headers } from 'next/headers'

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

  const topic = await getTopic(id)
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

  // 获取用户信息
  const headersList = await headers()
  const cookie = headersList.get('cookie') || ''
  const request = {
    headers: {
      get: (name: string) => name === 'cookie' ? cookie : null
    }
  } as any
  
  const payload = await verifyHeaderCookie(request)
  const userId = payload?.uid

  const topic = await getTopic(id, userId)
  if (!topic) {
    notFound()
  }

  return (
    <div className="container mx-auto my-4">
      <TopicDetail topic={topic} />
    </div>
  )
}