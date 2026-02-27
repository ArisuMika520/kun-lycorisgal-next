export interface KunNavItem {
  name: string
  href: string
  rel?: string
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
    name: '制作会社',
    href: '/companies'
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
  },
  {
    name: '以下为广告捏~',
    href: '/',
    rel: 'nofollow'
  },
  {
    name: 'Ai女友💋（在线游玩）',
    href: 'https://dearestie.xyz?ref_id=88f10d5a-aa3a-47a1-b850-94927bf7ba2f',
    rel: 'nofollow'
  },
  {
    name: '⚡️翻墙Vpn推荐',
    href: 'https://eueua.cc/#/register?code=u9ev6t6U',
    rel: 'nofollow'
  },
  {
    name: '木瓜玩-精品成人手遊聚合平台',
    href: 'https://t.glgnd.com/?pid=77',
    rel: 'nofollow'
  },
  {
    name: 'SoulAI',
    href: 'https://sch.xf5kv.com?channel=7018',
    rel: 'nofollow'
  }
]
