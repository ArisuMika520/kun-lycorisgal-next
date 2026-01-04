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
  {
    id: 'game-detail-ad1', //风月AI
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/%E9%A3%8E%E6%9C%88AI/1200x200-03.gif', // 游戏详情页专用广告图片
    link: 'https://dearestie.xyz?ref_id=88f10d5a-aa3a-47a1-b850-94927bf7ba2f' // 游戏详情页专用广告链接
  },
  {
    id: 'redirect-ad3', //bika
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/%E5%93%94%E5%92%94/1400x200.gif',
    link: 'https://aplsof2fd.kyrvrybhsovashordoblarmek.com/mk/44887/gxv1a1bk'
  },
  {
    id: 'redirect-ad4', //muguawan
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/mumu/mumu.jpg',
    link: 'https://t.glgnd.com/?pid=77'
  },
  {
    id: 'game-detail-ad2', //soulai
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/mumu/soul.gif',
    link: 'https://sch.agz1g.com/?channel=7018' // 游戏详情页专用广告链接
  }
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
      <div className={`grid gap-4 ${GAME_DETAIL_ADS_DATA.length === 1
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