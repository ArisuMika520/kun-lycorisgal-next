import { SUPPORTED_TYPE_MAP } from '~/constants/resource'
import type { KunSiteConfig } from './config'

const KUN_SITE_NAME = 'LyCorisGal'
const KUN_SITE_MENTION = '@lycorisgal'
const KUN_SITE_TITLE = 'LyCorisGal - Galgame引导资源站'
const KUN_SITE_IMAGE =
  'https://r2.lycorisgal.com/uploads/init/favicon.webp'
const KUN_SITE_DESCRIPTION =
  'LyCorisGal 是一个Galgame引导资源站。提供Galgame下载、补丁下载、Galgame工具下载、Galgame教程等服务。帮助用户轻松迅速学习并获取资源'
const KUN_SITE_URL = 'https://www.lycorisgal.com'
const KUN_SITE_ARCHIVE = 'https://www.lycorisgal.com/'
const KUN_SITE_FORUM = 'https://www.lycorisgal.com/'
const KUN_SITE_NAV = 'https://gal.sakinori.top'
const KUN_SITE_TELEGRAM_GROUP = 'https://t.me/+Gitp0H3pXLU5N2Fl'
const KUN_SITE_DISCORD_GROUP = '#'
const KUN_SITE_LIST = [
  { name: KUN_SITE_NAME, url: 'https://www.lycorisgal.com' }
]
const KUN_SITE_KEYWORDS = [
  'LyCorisGal',
  'Gal',
  'Galgame',
  '网站',
  'galgame资源站',
  'Galgame 下载',
  'Galgame 资源',
  'Galgame 补丁',
  'Galgame 教程',
  'Galgame 工具',
  'Galgame wiki',
  'Galgame 评测',
  'Galgame 新作动态',
  'Galgame 汉化 / 国际化',
  'Galgame 制作',
  'Galgame 讨论',
  '游戏交流',
  ...Object.values(SUPPORTED_TYPE_MAP)
]

export const kunMoyuMoe: KunSiteConfig = {
  title: KUN_SITE_TITLE,
  titleShort: KUN_SITE_NAME,
  template: `%s - ${KUN_SITE_NAME}`,
  description: KUN_SITE_DESCRIPTION,
  keywords: KUN_SITE_KEYWORDS,
  canonical: KUN_SITE_URL,
  author: [
    { name: KUN_SITE_TITLE, url: KUN_SITE_URL },
    { name: KUN_SITE_NAME, url: KUN_SITE_NAV },
    ...KUN_SITE_LIST
  ],
  creator: {
    name: KUN_SITE_NAME,
    mention: KUN_SITE_MENTION,
    url: KUN_SITE_URL
  },
  publisher: {
    name: KUN_SITE_NAME,
    mention: KUN_SITE_MENTION,
    url: KUN_SITE_URL
  },
  domain: {
    main: KUN_SITE_URL,
    imageBed: 'https://r2.lycorisgal.com',
    storage: KUN_SITE_URL,
    kungal: KUN_SITE_URL,
    telegram_group: KUN_SITE_TELEGRAM_GROUP,
    discord_group: KUN_SITE_DISCORD_GROUP,
    archive: KUN_SITE_ARCHIVE,
    forum: KUN_SITE_FORUM,
    nav: KUN_SITE_NAV
  },
  og: {
    title: KUN_SITE_TITLE,
    description: KUN_SITE_DESCRIPTION,
    image: KUN_SITE_IMAGE,
    url: KUN_SITE_URL
  },
  images: [
    {
      url: KUN_SITE_IMAGE,
      width: 1000,
      height: 800,
      alt: KUN_SITE_TITLE
    }
  ]
}
