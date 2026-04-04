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
    id: 'redirect-ad1', // 风月AI
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/%E9%A3%8E%E6%9C%88AI/1200x200-01.gif',
    link: 'https://genraton.xyz?ref_id=88f10d5a-aa3a-47a1-b850-94927bf7ba2f'
  },
  {
    id: 'redirect-ad2', // muguawan
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/mumu/mumu.jpg',
    link: 'https://t.ameaw.com/?pid=77'
  },
  {
    id: 'redirect-ad3', // eueuVPN
    title: '',
    description: '',
    image: 'https://r2.sakinori.top/eueuVPN/eueuVPN.jpg',
    link: 'https://eueua.cc/#/register?code=u9ev6t6U'
  }
]

const validRedirectAds = REDIRECT_ADS_DATA.filter(
  (ad) => ad.id.trim() && ad.image.trim() && ad.link.trim()
)

export const RedirectAds = () => {
  return (
    <div className="max-w-2xl">
      {validRedirectAds.map((ad) => (
        <a
          key={ad.id}
          href={ad.link}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="block transition-opacity cursor-pointer hover:opacity-80"
        >
          <Image
            src={ad.image}
            alt={ad.title}
            className="w-full h-auto rounded-lg object-contain"
            radius="lg"
          />
        </a>
      ))}
    </div>
  )
}
