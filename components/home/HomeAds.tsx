'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@heroui/card'
import { Image } from '@heroui/image'

interface AdItem {
  id: string
  title: string
  description: string
  image: string
  link: string
}

// 硬编码的广告数据
const ADS_DATA: AdItem[] = [
  {
    id: 'ad1', //风月AI
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/%E9%A3%8E%E6%9C%88AI/1200x200-02.gif',
    link: 'https://aigirlfriendstudio.com/?ref_id=88f10d5a-aa3a-47a1-b850-94927bf7ba2f'
  },
  {
    id: 'ad2', //eueuVPN
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/eueuVPN/eueuVPN.jpg',
    link: 'https://eueua.cc/#/register?code=u9ev6t6U'
  }
]

export const HomeAds = () => {
  const [isVisible, setIsVisible] = useState(true)
  const [visibleAds, setVisibleAds] = useState<AdItem[]>(ADS_DATA)

  const handleClose = () => {
    setIsVisible(false)
    // 不使用任何存储，关闭后只在当前页面生效
  }

  const handleAdClick = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  if (!isVisible || visibleAds.length === 0) {
    return null
  }

  return (
    <section className="relative w-full max-w-7xl mx-auto">
      {/* 关闭按钮 */}
      <Button
        isIconOnly
        size="sm"
        variant="light"
        className="absolute -top-2 -right-2 z-50 bg-background/80 backdrop-blur-sm border border-divider"
        onClick={handleClose}
      >
        <X className="w-4 h-4" />
      </Button>

      {/* 广告内容 */}
      <div className={`grid gap-4 ${
        visibleAds.length === 1
        ? 'grid-cols-1'
        : 'grid-cols-1 md:grid-cols-2'
        }`}>
        {visibleAds.map((ad) => (
          <Card
            key={ad.id}
            isPressable
            className="group cursor-pointer bg-transparent shadow-none"
            onClick={() => handleAdClick(ad.link)}
          >
            <CardBody className="p-0 bg-transparent">
              <div className="relative overflow-hidden min-h-24 max-h-32 bg-transparent flex items-center justify-center rounded-lg">
                <Image
                  src={ad.image}
                  alt={ad.title}
                  className="w-full h-auto object-contain"
                  radius="lg"
                  style={{
                    width: 'auto',
                    maxWidth: '100%',
                    minWidth: '80%'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="font-bold text-lg mb-1">{ad.title}</h3>
                  <p className="text-sm opacity-90">{ad.description}</p>
                </div>
                {/* 悬停效果 */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  )
}