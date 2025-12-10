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
  {
    id: 'redirect-ad1', //风月AI
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/%E9%A3%8E%E6%9C%88AI/1200x200-01.gif',
    link: 'https://aigirlfriendstudio.com/?ref_id=88f10d5a-aa3a-47a1-b850-94927bf7ba2f'
  },
  {
    id: '',
    title: ' ',
    description: ' ',
    image: ' ',
    link: ' '
  },
  {
    id: 'redirect-ad4', //muguawan
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/mumu/mumu.jpg',
    link: 'https://t.glgnd.com/?pid=77'
  }
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