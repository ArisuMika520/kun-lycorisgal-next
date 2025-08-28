'use client'

import { TopicCard } from './TopicCard'
import type { TopicCard as TopicCardType } from '@/types/api/topic'
import { cn } from '@/utils/cn'
import { Button } from '@heroui/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useMounted } from '~/hooks/useMounted'

interface Props {
  topics: TopicCardType[]
  className?: string
  columns?: 1 | 2 | 3 | 4
  showEmpty?: boolean
}

export const TopicList = ({ 
  topics, 
  className, 
  columns = 1,
  showEmpty = true 
}: Props) => {
  const router = useRouter()
  const mounted = useMounted()

  if (topics.length === 0 && showEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Image
          src="/null.webp"
          alt="暂无话题"
          width={120}
          height={120}
          className="mb-4 opacity-60"
        />
        <h3 className="text-lg font-semibold text-foreground/80 mb-2">
          暂无话题
        </h3>
        <p className="text-sm text-foreground/60 mb-4">
          还没有人发布话题，快来发布第一个话题吧！
        </p>
        {mounted && (
          <Button
            color="primary"
            onPress={() => router.push('/topic/create')}
          >
            发布话题
          </Button>
        )}
      </div>
    )
  }

  const getGridCols = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1'
      case 2:
        return 'grid-cols-1 md:grid-cols-2'
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      default:
        return 'grid-cols-1'
    }
  }

  return (
    <div 
      className={cn(
        'grid gap-4',
        getGridCols(),
        className
      )}
    >
      {topics.map((topic) => (
        <TopicCard 
          key={topic.id} 
          topic={topic}
        />
      ))}
    </div>
  )
}