'use client'

import { Card, CardBody } from '@heroui/card'
import { Image } from '@heroui/image'

interface AdItem {
  id: string
  title: string
  description: string
  image: string
  link: string
}

// 游戏详情页独立的广告数据配置
const GAME_DETAIL_ADS_DATA: AdItem[] = [
  /*{
    id: 'game-detail-ad1',
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/1200x200.png', // 游戏详情页专用广告图片
    link: 'https://www.example.com/game-detail-ad' // 游戏详情页专用广告链接
  },
  {
    id: 'game-detail-ad1',
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/1200x200.png', // 游戏详情页专用广告图片
    link: 'https://www.example.com/game-detail-ad' // 游戏详情页专用广告链接
  },
  */
]

export const GameDetailAds = () => {
  const handleAdClick = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  if (GAME_DETAIL_ADS_DATA.length === 0) {
    return null
  }

  return (
    <section className="relative w-full max-w-7xl mx-auto mt-6">
      {/* 广告内容 */}
      <div className={`grid gap-4 ${
        GAME_DETAIL_ADS_DATA.length === 1 
          ? 'grid-cols-1' 
          : 'grid-cols-1 md:grid-cols-2'
      }`}>
        {GAME_DETAIL_ADS_DATA.map((ad) => (
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