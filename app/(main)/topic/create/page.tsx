import { CreateTopic } from '~/components/topic'
import type { Metadata } from 'next'
import { kunMoyuMoe } from '~/config/moyu-moe'

export const metadata: Metadata = {
  title: `创建话题 - ${kunMoyuMoe.title}`,
  description: '创建新的话题讨论'
}

export default function CreateTopicPage() {
  return (
    <div className="container mx-auto my-4">
      <CreateTopic />
    </div>
  )
}