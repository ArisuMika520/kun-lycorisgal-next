export interface KunNavItem {
  name: string
  href: string
}

export const kunNavItem: KunNavItem[] = [
]

export const kunMobileNavItem: KunNavItem[] = [
  ...kunNavItem,
  {
    name: '评论列表',
    href: '/comment'
  },
  {
    name: '下载资源列表',
    href: '/resource'
  },
  {
    name: '联系我们',
    href: '/doc/notice/feedback'
  }
]
