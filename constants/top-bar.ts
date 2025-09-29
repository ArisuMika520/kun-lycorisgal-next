export interface KunNavItem {
  name: string
  href: string
}

export const kunNavItem: KunNavItem[] = [
]

export const kunMobileNavItem: KunNavItem[] = [
  ...kunNavItem,
  {
    name: 'Galame',
    href: '/galgame'
  },
  {
    name: '游戏补丁',
    href: '/resource'
  },
  {
    name: '标签列表',
    href: '/tag'
  },
  {
    name: '评论列表',
    href: '/comment'
  },
  {
    name: '帮助文档',
    href: '/doc'
  },
  {
    name: '加入我们',
    href: 'https://t.me/LyCoriseGAL'
  }
]
