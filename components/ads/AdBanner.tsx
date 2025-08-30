'use client'

import { useState, useEffect, Suspense } from 'react'
import { X } from 'lucide-react'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@heroui/card'

interface AdBannerProps {
  type?: 'banner' | 'sidebar' | 'inline'
  position?: 'top' | 'bottom' | 'middle'
  closeable?: boolean
  className?: string
}

export const AdBanner = ({ 
  type = 'banner', 
  position = 'middle',
  closeable = true,
  className = ''
}: AdBannerProps) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // 优化：减少加载延迟，使用 requestAnimationFrame 确保在下一帧渲染
    const loadAd = () => {
      requestAnimationFrame(() => {
        setIsLoaded(true)
      })
    }
    
    loadAd()
  }, [])

  if (!isVisible) return null

  const getAdContent = () => {
    switch (type) {
      case 'banner':
        return (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">推荐内容</h3>
                <p className="text-sm opacity-90">发现更多精彩的 Galgame 内容和资源</p>
              </div>
              <Button 
                variant="light" 
                className="text-white hover:bg-white/20"
                size="sm"
              >
                了解更多
              </Button>
            </div>
          </div>
        )
      case 'sidebar':
        return (
          <Card className="w-full">
            <CardBody className="p-4">
              <div className="text-center space-y-3">
                <div className="w-full h-32 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-medium">广告位</span>
                </div>
                <p className="text-sm text-foreground/70">相关推荐内容</p>
              </div>
            </CardBody>
          </Card>
        )
      case 'inline':
        return (
          <Card className="border-l-4 border-primary">
            <CardBody className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-medium">AD</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">精选推荐</h4>
                  <p className="text-xs text-foreground/60">为您推荐相关的优质内容</p>
                </div>
              </div>
            </CardBody>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className={`relative ${className}`}>
      {closeable && (
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="absolute -top-2 -right-2 z-10 min-w-6 h-6 bg-background/80 backdrop-blur-sm border"
          onPress={() => setIsVisible(false)}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
      <Suspense fallback={
        <div className="flex h-16 items-center justify-center bg-gray-50 dark:bg-gray-900 animate-pulse">
          <div className="text-xs text-gray-400">广告加载中...</div>
        </div>
      }>
        {!isLoaded ? (
          <div className="flex h-16 items-center justify-center bg-gray-50 dark:bg-gray-900 animate-pulse">
            <div className="text-xs text-gray-400">广告加载中...</div>
          </div>
        ) : (
          getAdContent()
        )}
      </Suspense>
    </div>
  )
}

// 广告容器组件，用于控制广告显示逻辑
export const AdContainer = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
    </div>
  )
}

// 一行两个广告的横幅组件
export const AdBannerRow = ({ 
  closeable = true,
  className = ''
}: { 
  closeable?: boolean
  className?: string 
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loadAd = () => {
      requestAnimationFrame(() => {
        setIsLoaded(true)
      })
    }
    
    loadAd()
  }, [])

  if (!isVisible) return null

  const getAdContent = (index: number) => {
    const gradients = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600'
    ]
    const titles = ['推荐内容', '精选游戏']
    const descriptions = [
      '发现更多精彩的 Galgame 内容和资源',
      '探索优质的视觉小说和互动体验'
    ]

    return (
      <div className={`bg-gradient-to-r ${gradients[index]} text-white p-4 rounded-lg flex-1`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{titles[index]}</h3>
            <p className="text-sm opacity-90">{descriptions[index]}</p>
          </div>
          <Button 
            variant="light" 
            className="text-white hover:bg-white/20"
            size="sm"
          >
            了解更多
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {closeable && (
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="absolute -top-2 -right-2 z-10 min-w-6 h-6 bg-background/80 backdrop-blur-sm border"
          onPress={() => setIsVisible(false)}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
      <Suspense fallback={
        <div className="flex h-16 items-center justify-center bg-gray-50 dark:bg-gray-900 animate-pulse">
          <div className="text-xs text-gray-400">广告加载中...</div>
        </div>
      }>
        {!isLoaded ? (
          <div className="flex h-16 items-center justify-center bg-gray-50 dark:bg-gray-900 animate-pulse">
            <div className="text-xs text-gray-400">广告加载中...</div>
          </div>
        ) : (
          <div className="flex gap-4">
            {getAdContent(0)}
            {getAdContent(1)}
          </div>
        )}
      </Suspense>
    </div>
  )
}