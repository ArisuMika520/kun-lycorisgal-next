'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@heroui/card'
import { cn } from '~/utils/cn'
import type { KunAdBanner } from '~/config/ads'

interface Props {
  /** 广告数据, 一次性全部渲染(不轮播) */
  ads: KunAdBanner[]
  /** card: 带卡片/悬停(首页、详情页); plain: 纯图片堆叠(跳转页) */
  variant?: 'card' | 'plain'
  /** 是否显示关闭按钮(仅当前页面生效, 不持久化) */
  closable?: boolean
  /** 追加到外层容器的样式, 如 mt-6 */
  className?: string
}

// 广告创意固定为 1200x200 (6:1), 用 aspect-[6/1] 精确预留高度:
// 避免加载时高度跳动(偏移), 同时让横幅在任意宽度下精确填满(无 letterbox 黑框)
const CardAd = ({ ad }: { ad: KunAdBanner }) => (
  <Card
    isPressable
    as="a"
    href={ad.link}
    target="_blank"
    rel="nofollow noopener noreferrer"
    className="group cursor-pointer overflow-hidden rounded-lg bg-transparent shadow-none"
  >
    <CardBody className="p-0 bg-transparent">
      <div className="relative aspect-[6/1] w-full overflow-hidden rounded-lg">
        <img
          src={ad.image}
          alt={ad.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* 悬停效果 */}
        <div className="absolute inset-0 bg-primary/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
    </CardBody>
  </Card>
)

const PlainAd = ({ ad }: { ad: KunAdBanner }) => (
  <a
    href={ad.link}
    target="_blank"
    rel="nofollow noopener noreferrer"
    className="block overflow-hidden rounded-lg transition-opacity cursor-pointer hover:opacity-80"
  >
    <div className="relative aspect-[6/1] w-full">
      <img
        src={ad.image}
        alt={ad.title}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  </a>
)

export const KunAdSlot = ({
  ads,
  variant = 'card',
  closable = false,
  className
}: Props) => {
  const [isVisible, setIsVisible] = useState(true)

  const validAds = ads.filter(
    (ad) => ad.id.trim() && ad.image.trim() && ad.link.trim()
  )

  if (!isVisible || validAds.length === 0) {
    return null
  }

  // 纯图片堆叠(跳转页样式)
  if (variant === 'plain') {
    return (
      <div className={cn('flex flex-col gap-4 w-full max-w-2xl', className)}>
        {validAds.map((ad, index) => (
          <PlainAd key={`${ad.id}-${index}`} ad={ad} />
        ))}
      </div>
    )
  }

  // 卡片样式(首页、详情页): 单条占满, 多条桌面端一行两列、移动端单列堆叠
  return (
    <section className={cn('relative w-full max-w-7xl mx-auto', className)}>
      {closable && (
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="absolute -top-2 -right-2 z-50 bg-background/80 backdrop-blur-sm border border-divider"
          onClick={() => setIsVisible(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      <div
        className={cn(
          'grid gap-4',
          validAds.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
        )}
      >
        {validAds.map((ad, index) => (
          <CardAd key={`${ad.id}-${index}`} ad={ad} />
        ))}
      </div>
    </section>
  )
}
