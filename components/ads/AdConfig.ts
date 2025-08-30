// 广告配置文件
export interface AdPlacement {
  id: string
  type: 'banner' | 'sidebar' | 'inline' | 'banner-row'
  position: 'top' | 'bottom' | 'middle'
  pages: string[] // 显示在哪些页面
  frequency: number // 显示频率 (1-100)
  closeable: boolean
  priority: number // 优先级 (1-10)
}

// 广告位配置
export const adPlacements: AdPlacement[] = [
  // 侧栏广告位配置
  {
    id: 'sidebar-top',
    type: 'sidebar',
    position: 'top',
    pages: ['/', '/galgame', '/resource', '/topic', '/tag'],
    frequency: 85,
    closeable: true,
    priority: 6
  },
  {
    id: 'sidebar-middle',
    type: 'sidebar',
    position: 'middle',
    pages: ['/', '/galgame', '/resource', '/topic'],
    frequency: 75,
    closeable: true,
    priority: 5
  },
  {
    id: 'sidebar-bottom',
    type: 'sidebar',
    position: 'bottom',
    pages: ['/', '/galgame', '/resource'],
    frequency: 65,
    closeable: true,
    priority: 4
  }
]

// 广告显示逻辑
export const shouldShowAd = (placement: AdPlacement, currentPath: string): boolean => {
  // 检查页面匹配
  const pageMatch = placement.pages.some(page => {
    if (page === '/') {
      return currentPath === '/'
    }
    if (page.includes('[id]')) {
      // 匹配动态路由 - 游戏详情页路径格式为 /unique-id
      return /^\/[^/]+$/.test(currentPath) && 
             currentPath !== '/' && 
             !currentPath.startsWith('/galgame') && 
             !currentPath.startsWith('/resource') && 
             !currentPath.startsWith('/topic') && 
             !currentPath.startsWith('/tag') && 
             !currentPath.startsWith('/user') && 
             !currentPath.startsWith('/admin') && 
             !currentPath.startsWith('/auth') && 
             !currentPath.startsWith('/apply') && 
             !currentPath.startsWith('/friend-link')
    }
    return currentPath.startsWith(page)
  })

  if (!pageMatch) {
    return false
  }

  // 根据频率随机显示
  return Math.random() * 100 < placement.frequency
}

// 获取页面的广告配置
export const getPageAds = (currentPath: string): AdPlacement[] => {
  return adPlacements
    .filter(placement => shouldShowAd(placement, currentPath))
    .sort((a, b) => b.priority - a.priority)
}

// 广告间隔配置（避免广告过于密集）
export const adSpacing = {
  minItemsBetweenAds: 6, // 列表中广告之间最少间隔的项目数
  maxAdsPerPage: 3, // 每页最多显示的广告数
  scrollThreshold: 300 // 滚动多少像素后才显示下一个广告
}