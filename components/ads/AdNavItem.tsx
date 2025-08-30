'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '~/utils/cn'
import { Tooltip } from '@heroui/tooltip'
import { Image } from '@heroui/image'
import { ExternalLink } from 'lucide-react'
import { useAds } from '~/hooks/useAds'

interface AdNavItemProps {
  name: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adImage?: string
  adTitle?: string
  adDescription?: string
  isActive?: boolean
  isCollapsed?: boolean
  className?: string
}

export const AdNavItem = ({
  name,
  description,
  href,
  icon: Icon,
  adImage,
  adTitle,
  adDescription,
  isActive = false,
  isCollapsed = false,
  className = ''
}: AdNavItemProps) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const { adsEnabled } = useAds()

  if (!adsEnabled) return null

  const handleClick = () => {
    // 这里可以添加广告点击统计
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const navContent = (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer group',
        'hover:bg-primary/10 hover:text-primary',
        isActive && 'bg-primary text-primary-foreground',
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Icon className={cn(
        'size-5 flex-shrink-0 transition-colors',
        isActive ? 'text-primary-foreground' : 'text-foreground/70 group-hover:text-primary'
      )} />
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <div className={cn(
            'font-medium text-sm truncate',
            isActive ? 'text-primary-foreground' : 'text-foreground group-hover:text-primary'
          )}>
            {name}
          </div>
          <div className={cn(
            'text-xs truncate mt-0.5',
            isActive ? 'text-primary-foreground/80' : 'text-foreground/60 group-hover:text-primary/80'
          )}>
            {description}
          </div>
        </div>
      )}
      {!isCollapsed && (
        <ExternalLink className={cn(
          'size-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
          isActive ? 'text-primary-foreground' : 'text-foreground/50'
        )} />
      )}
    </div>
  )

  // 如果有广告图片且鼠标悬停，显示图片预览
  if (adImage && showTooltip && !isCollapsed) {
    return (
      <Tooltip
        content={
          <div className="px-2 py-2 max-w-[320px]">
            <p className="font-bold text-foreground">{adTitle || name}</p>
            <p className="text-xs text-default-600 mb-2">{adDescription || description}</p>
            <Image
              src={adImage}
              alt={adTitle || name}
              className="w-full"
              width={320}
              radius="md"
            />
          </div>
        }
        placement="right"
        delay={300}
        closeDelay={100}
        classNames={{
          content: 'p-0 bg-background border shadow-lg'
        }}
      >
        {navContent}
      </Tooltip>
    )
  }

  // 折叠状态下的tooltip，如果有广告图片则显示图片预览
  if (isCollapsed) {
    return (
      <Tooltip
        content={
          adImage ? (
            <div className="px-2 py-2 max-w-[320px]">
              <p className="font-bold text-foreground">{adTitle || name}</p>
              <p className="text-xs text-default-600 mb-2">{adDescription || description}</p>
              <Image
                src={adImage}
                alt={adTitle || name}
                className="w-full"
                width={320}
                radius="md"
              />
            </div>
          ) : (
            <div className="px-2 py-1">
              <p className="font-medium text-sm">{name}</p>
              <p className="text-xs text-default-600">{description}</p>
            </div>
          )
        }
        placement="right"
        delay={300}
        classNames={adImage ? {
          content: 'p-0 bg-background border shadow-lg'
        } : undefined}
      >
        {navContent}
      </Tooltip>
    )
  }

  return navContent
}