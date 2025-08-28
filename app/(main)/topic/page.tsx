import { Suspense } from 'react'
import { TopicListPage } from '~/components/topic/TopicListPage'
import type { Metadata } from 'next'
import { kunMoyuMoe } from '~/config/moyu-moe'

export const metadata: Metadata = {
  title: `话题列表 - ${kunMoyuMoe.title}`,
  description: '浏览所有话题讨论'
}

function TopicListLoading() {
  return (
    <div className="container mx-auto my-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">话题列表</h1>
          <p className="text-sm text-foreground/60 mt-1">加载中...</p>
        </div>
      </div>
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">加载中...</div>
      </div>
    </div>
  )
}

export default function TopicPage() {
  return (
    <Suspense fallback={<TopicListLoading />}>
      <TopicListPage />
    </Suspense>
  )
}