'use client'

import { Image } from '@heroui/image'

interface AdItem {
  id: string
  title: string
  description: string
  image: string
  link: string
}

// 独立配置的广告数据
const REDIRECT_ADS_DATA: AdItem[] = [
  //{
  //  id: 'redirect-ad1',
  //  title: '广告',
  //  description: '点击查看更多优质内容',
  //  image: 'https://r2.sakinori.top/1200x200.png',
  //  link: 'https://www.example.com/redirect-ad'
  //}
]

const handleAdClick = (link: string) => {
  window.open(link, '_blank', 'noopener,noreferrer')
}

export const RedirectAds = () => {
  return (
    <div className="max-w-2xl">
      {REDIRECT_ADS_DATA.map((ad) => (
        <div
          key={ad.id}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleAdClick(ad.link)}
        >
          <Image
            src={ad.image}
            alt={ad.title}
            className="w-full h-auto object-contain rounded-lg"
            radius="lg"
          />
        </div>
      ))}
    </div>
  )
}