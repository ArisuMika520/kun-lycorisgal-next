import { kunMoyuMoe } from '~/config/moyu-moe'
import type { Metadata } from 'next'

const title = '以图识Gal'
const description =
  '上传或粘贴截图，识别角色与作品，并一键跳到站内搜索。图片不会保存到图床。'

export const kunMetadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    images: kunMoyuMoe.images
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description
  },
  alternates: {
    canonical: `${kunMoyuMoe.domain.main}/identify`
  }
}
