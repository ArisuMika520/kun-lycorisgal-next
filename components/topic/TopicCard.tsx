'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardBody, CardFooter } from '@heroui/card'
import { Avatar } from '@heroui/avatar'
import { Chip } from '@heroui/chip'
import { Eye, Heart, MessageSquare, Pin } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/formatNumber'
import { formatDistanceToNow } from '@/utils/formatDistanceToNow'
import { markdownToText } from '@/utils/markdownToText'
import type { TopicCard as TopicCardType } from '@/types/api/topic'

interface Props {
  topic: TopicCardType
  className?: string
}

export const TopicCard = ({ topic, className }: Props) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      isPressable
      as={Link}
      href={`/topic/${topic.id}`}
      className={cn(
        'flex flex-col gap-2 p-4 transition-all duration-200 border shadow-sm rounded-xl group border-divider hover:shadow-lg hover:border-primary-200',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardBody className="p-0">
        {/* 话题头部信息 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar
              src={topic.user.avatar && topic.user.avatar.trim() !== '' ? topic.user.avatar : undefined}
              alt={topic.user.name}
              size="sm"
              className="flex-shrink-0"
              name={topic.user.name.charAt(0).toUpperCase()}
              showFallback
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground/90 truncate">
                  {topic.user.name}
                </span>
                {topic.is_pinned && (
                  <Chip
                    size="sm"
                    variant="flat"
                    color="warning"
                    startContent={<Pin className="size-3" />}
                    className="text-xs"
                  >
                    置顶
                  </Chip>
                )}
              </div>
              <span className="text-xs text-foreground/60">
                {formatDistanceToNow(new Date(topic.created))}
              </span>
            </div>
          </div>
        </div>

        {/* 话题标题 */}
        <h2
          className={cn(
            'text-lg font-semibold mb-3 transition-colors line-clamp-2 text-foreground/90',
            isHovered ? 'text-primary' : ''
          )}
          title={topic.title}
        >
          {topic.title}
        </h2>

        {/* 话题内容预览 */}
        <p className="text-sm text-foreground/70 line-clamp-3 mb-4 leading-relaxed">
          {markdownToText(topic.content)}
        </p>
      </CardBody>

      <CardFooter className="p-0 pt-3 border-t border-divider/50">
        {/* 统计信息 */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4 text-sm text-foreground/60">
            <div className="flex items-center gap-1">
              <Eye className="size-4" />
              <span>{formatNumber(topic.view_count)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="size-4" />
              <span>{formatNumber(topic.like_count)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="size-4" />
              <span>{topic.comment_count}</span>
            </div>
          </div>
          
          {/* 更新时间 */}
          <span className="text-xs text-foreground/50">
            更新于 {formatDistanceToNow(new Date(topic.updated))}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}