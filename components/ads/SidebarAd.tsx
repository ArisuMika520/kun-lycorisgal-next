'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, Star, Heart, Gamepad2 } from 'lucide-react'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@heroui/card'
import { Image } from '@heroui/image'
import { Chip } from '@heroui/chip'
import { useAds } from '~/hooks/useAds'
import type { AdPlacement } from './AdConfig'

interface SidebarAdProps {
  placement: AdPlacement
  className?: string
}

export const SidebarAd = ({ placement, className = '' }: SidebarAdProps) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const { adsEnabled } = useAds()

  useEffect(() => {
    const loadAd = () => {
      requestAnimationFrame(() => {
        setIsLoaded(true)
      })
    }
    loadAd()
  }, [])

  if (!isVisible || !adsEnabled || !isLoaded) return null

  const getAdContent = () => {
    switch (placement.position) {
      case 'top':
        return (
          <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardBody className="p-0">
              <div className="relative overflow-hidden rounded-lg">
                <div className="w-full h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="text-center z-10">
                    <Gamepad2 className="size-8 text-white mb-2 mx-auto" />
                    <p className="text-white font-medium text-sm">精选游戏推荐</p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-foreground">热门 Galgame</h4>
                    <Chip size="sm" color="primary" variant="flat">推荐</Chip>
                  </div>
                  <p className="text-xs text-foreground/70 mb-3 leading-relaxed">
                    发现最新最热门的 Galgame，体验精彩的视觉小说世界
                  </p>
                  <Button 
                    size="sm" 
                    color="primary" 
                    variant="flat"
                    className="w-full"
                    endContent={<ExternalLink className="size-3" />}
                  >
                    查看详情
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )
      
      case 'middle':
        return (
          <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardBody className="p-4">
              <div className="text-center space-y-3">
                <div className="w-full h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="z-10 flex items-center space-x-2">
                    <Star className="size-5 text-white" />
                    <span className="text-white font-medium text-sm">优质内容</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-foreground">社区精选</h4>
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    社区用户推荐的优质资源和攻略
                  </p>
                  <Button 
                    size="sm" 
                    variant="bordered"
                    className="w-full text-xs"
                  >
                    立即查看
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )
      
      case 'bottom':
        return (
          <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardBody className="p-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Heart className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground mb-1">支持我们</h4>
                  <p className="text-xs text-foreground/60 leading-relaxed mb-2">
                    您的支持是我们前进的动力
                  </p>
                  <Button 
                    size="sm" 
                    color="secondary"
                    variant="flat"
                    className="text-xs h-7"
                  >
                    了解更多
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )
      
      default:
        return (
          <Card className="w-full">
            <CardBody className="p-4">
              <div className="text-center space-y-3">
                <div className="w-full h-32 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-medium">广告位</span>
                </div>
                <p className="text-sm text-foreground/70">相关推荐内容</p>
              </div>
            </CardBody>
          </Card>
        )
    }
  }

  return (
    <div className={`relative ${className}`}>
      {placement.closeable && (
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="absolute -top-2 -right-2 z-20 min-w-6 h-6 bg-background/90 backdrop-blur-sm border shadow-sm hover:bg-background"
          onPress={() => setIsVisible(false)}
        >
          <X className="size-3" />
        </Button>
      )}
      {getAdContent()}
    </div>
  )
}

// 侧栏广告容器组件
export const SidebarAdContainer = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  )
}