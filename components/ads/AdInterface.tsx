'use client'

import { useState, useEffect } from 'react'
import { useAds } from '~/hooks/useAds'

// 广告内容接口
interface AdContent {
  id: string
  title: string
  imageUrl: string // 支持图床URL，包括GIF
  clickUrl: string // 点击跳转链接
  description?: string
  isActive: boolean
}

// 广告配置接口
interface AdConfig {
  showHomeBannerRow: boolean // 首页横幅广告（1行两个）
  showSidebarAds: boolean    // 侧栏广告
  showRedirectAd: boolean    // redirect页面广告
  homeBannerAds: AdContent[]
  sidebarAds: AdContent[]
  sidebarNavAds: AdContent[] // 侧栏导航广告（鼠标悬停显示图片）
  redirectAd: AdContent      // redirect页面单个广告
}

// 默认广告配置
const defaultAdConfig: AdConfig = {
  showHomeBannerRow: true,
  showSidebarAds: true,
  showRedirectAd: true,
  homeBannerAds: [
    {
      id: 'banner1',
      title: '示例广告1',
      imageUrl: 'https://r2.sakinori.top/6e194add9120240905110255.webp',
      clickUrl: 'https://example.com/link1',
      description: '这是一个示例广告',
      isActive: true,
    },
    {
      id: 'banner2',
      title: '示例广告2',
      imageUrl: 'https://r2.sakinori.top/6e194add9120240905110255.webp',
      clickUrl: 'https://example.com/link2',
      description: '这是另一个示例广告',
      isActive: true,
    },
  ],
  sidebarAds: [
    {
      id: 'side-top',
      title: '侧栏顶部广告',
      imageUrl: 'https://example.com/sidebar-top.png',
      clickUrl: 'https://example.com/sidebar-link1',
      description: '侧栏顶部广告位',
      isActive: true,
    },
    {
      id: 'side-mid',
      title: '侧栏中部广告',
      imageUrl: 'https://example.com/sidebar-middle.gif',
      clickUrl: 'https://example.com/sidebar-link2',
      description: '侧栏中部广告位',
      isActive: true,
    },
    {
      id: 'side-bot',
      title: '侧栏底部广告',
      imageUrl: 'https://example.com/sidebar-bottom.jpg',
      clickUrl: 'https://example.com/sidebar-link3',
      description: '侧栏底部广告位',
      isActive: true,
    },
  ],
  sidebarNavAds: [
    {
      id: 'nav-feat',
      title: '精选 Galgame 推荐',
      imageUrl: '/touchgal.avif',
      clickUrl: 'https://example.com/featured-games',
      description: '发现最新最热门的 Galgame，体验精彩的视觉小说世界',
      isActive: true,
    },
    {
      id: 'nav-comm',
      title: '社区精选内容',
      imageUrl: '/touchgal.avif',
      clickUrl: 'https://example.com/community-picks',
      description: '社区用户推荐的优质资源和攻略分享',
      isActive: true,
    },
    {
      id: 'nav-spec',
      title: '限时特惠活动',
      imageUrl: '/touchgal.avif',
      clickUrl: 'https://example.com/special-offers',
      description: '不容错过的限时优惠和特别活动',
      isActive: true,
    },
  ],
  redirectAd: {
    id: 'redir-ad',
    title: 'Redirect页面广告',
    imageUrl: 'https://r2.sakinori.top/6e194add9120240905110255.webp',
    clickUrl: 'https://example.com/redirect-link',
    description: 'Redirect页面专属广告位',
    isActive: true,
  }
}

// 首页横幅广告组件（1行两个）
export const HomeBannerRowAd = ({ className = '' }: { className?: string }) => {
  const { adsEnabled, shouldShowAd } = useAds()
  const [adConfig, setAdConfig] = useState<AdConfig>(defaultAdConfig)
  const [userPreferences, setUserPreferences] = useState({ showHomeBannerRow: true })
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({})
  const [imageLoaded, setImageLoaded] = useState<{[key: string]: boolean}>({})

  const loadConfig = () => {
    if (typeof window === 'undefined') return
    const savedConfig = localStorage.getItem('ad-config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        console.log('HomeBannerRowAd - Raw saved config:', config)
        // 直接使用保存的配置，如果某些字段缺失则使用默认值
        const mergedConfig = {
          ...defaultAdConfig,
          ...config,
          // 确保数组字段正确合并
          homeBannerAds: config.homeBannerAds || defaultAdConfig.homeBannerAds,
          sidebarAds: config.sidebarAds || defaultAdConfig.sidebarAds,
          sidebarNavAds: config.sidebarNavAds || defaultAdConfig.sidebarNavAds,
          redirectAd: config.redirectAd || defaultAdConfig.redirectAd
        }
        console.log('HomeBannerRowAd - Merged config:', mergedConfig)
        setAdConfig(mergedConfig)
      } catch (error) {
        console.error('Failed to parse ad config:', error)
        setAdConfig(defaultAdConfig)
      }
    } else {
      console.log('HomeBannerRowAd - No saved config, using default')
      setAdConfig(defaultAdConfig)
    }
  }

  const loadUserPreferences = () => {
    if (typeof window === 'undefined') return
    const savedPreferences = localStorage.getItem('user-ad-preferences')
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences)
        setUserPreferences({ showHomeBannerRow: preferences.showHomeBannerRow ?? true })
      } catch (error) {
        console.error('Failed to parse user ad preferences:', error)
      }
    }
  }

  useEffect(() => {
    loadConfig()
    loadUserPreferences()
    
    // 监听管理员配置更新事件
    const handleConfigUpdate = () => {
      loadConfig()
      setImageErrors({}) // 重置图片错误状态
      setImageLoaded({}) // 重置图片加载状态
    }
    
    // 监听用户偏好更新事件
    const handleUserPreferencesUpdate = () => {
      loadUserPreferences()
    }
    
    // 监听localStorage变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ad-config') {
        loadConfig()
        setImageErrors({}) // 重置图片错误状态
        setImageLoaded({}) // 重置图片加载状态
      }
    }
    
    window.addEventListener('adConfigUpdated', handleConfigUpdate)
    window.addEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
    window.addEventListener('storage', handleStorageChange)
    
    // 定期检查配置更新（作为备用机制）
    const intervalId = setInterval(() => {
      loadConfig()
    }, 5000)
    
    return () => {
      window.removeEventListener('adConfigUpdated', handleConfigUpdate)
      window.removeEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(intervalId)
    }
  }, [])

  // 检查是否应该显示广告
  if (!adsEnabled || !userPreferences.showHomeBannerRow || !shouldShowAd('home-banner-row')) {
    return null
  }

  const activeAds = adConfig.homeBannerAds.filter(ad => ad.isActive).slice(0, 2)
  
  if (activeAds.length === 0) {
    return null
  }

  return (
    <div className={`w-full my-6 ${className}`}>
      <div className="w-full py-4">
        <div className="flex gap-4 w-full">
          {activeAds.map((ad) => (
            <a
              key={ad.id}
              href={ad.clickUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-32 rounded-lg overflow-hidden border border-divider hover:shadow-lg transition-shadow duration-200 group"
            >
              <div className="w-full h-full relative bg-content2 rounded-lg overflow-hidden">
                {ad.imageUrl && !imageErrors[ad.id] ? (
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={() => setImageErrors(prev => ({ ...prev, [ad.id]: true }))}
                    onLoad={() => {
                      setImageErrors(prev => ({ ...prev, [ad.id]: false }))
                      setImageLoaded(prev => ({ ...prev, [ad.id]: true }))
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-content2 flex items-center justify-center">
                    <span className="text-foreground/60 text-sm">{ad.title}</span>
                  </div>
                )}
              </div>
            </a>
          ))}
          {/* 如果只有一个广告，显示占位符 */}
          {activeAds.length === 1 && (
            <div className="flex-1 h-32 bg-content2 rounded-lg flex items-center justify-center border border-divider">
              <span className="text-foreground/40 text-sm">广告位空闲</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 侧栏广告组件
export const SidebarAd = ({ 
  position = 'top',
  className = '' 
}: { 
  position?: 'top' | 'middle' | 'bottom'
  className?: string 
}) => {
  const { adsEnabled, shouldShowAd } = useAds()
  const [adConfig, setAdConfig] = useState<AdConfig>(defaultAdConfig)
  const [userPreferences, setUserPreferences] = useState({ showSidebarAds: true })

  const loadConfig = () => {
    if (typeof window === 'undefined') return
    const savedConfig = localStorage.getItem('ad-config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setAdConfig({ ...defaultAdConfig, ...config })
      } catch (error) {
        console.error('Failed to parse ad config:', error)
      }
    }
  }

  const loadUserPreferences = () => {
    if (typeof window === 'undefined') return
    const savedPreferences = localStorage.getItem('user-ad-preferences')
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences)
        setUserPreferences({ showSidebarAds: preferences.showSidebarAds ?? true })
      } catch (error) {
        console.error('Failed to parse user ad preferences:', error)
      }
    }
  }

  useEffect(() => {
    loadConfig()
    loadUserPreferences()
    
    // 监听管理员配置更新事件
    const handleConfigUpdate = () => {
      loadConfig()
    }
    
    // 监听用户偏好更新事件
    const handleUserPreferencesUpdate = () => {
      loadUserPreferences()
    }
    
    window.addEventListener('adConfigUpdated', handleConfigUpdate)
    window.addEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
    
    return () => {
      window.removeEventListener('adConfigUpdated', handleConfigUpdate)
      window.removeEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
    }
  }, [])

  // 检查是否应该显示广告
  if (!adsEnabled || !userPreferences.showSidebarAds || !shouldShowAd(`sidebar-${position}`)) {
    return null
  }

  // 根据position找到对应的广告
  const positionMap = {
    top: 'side-top',
    middle: 'side-mid',
    bottom: 'side-bot'
  }
  
  const ad = adConfig.sidebarAds.find(ad => 
    ad.id === positionMap[position] && ad.isActive
  )
  
  if (!ad) {
    return null
  }

  return (
    <div className={`mb-6 ${className}`}>
      <a
        href={ad.clickUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-20 rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200 group"
        title={ad.description || ad.title}
      >
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat flex items-center justify-center relative"
          style={{ backgroundImage: `url(${ad.imageUrl})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
          {!ad.imageUrl && (
            <span className="text-gray-600 text-xs z-10">{ad.title}</span>
          )}
        </div>
      </a>
    </div>
  )
}

// 获取侧栏导航广告数据的函数
export const getSidebarNavAdData = (index: number) => {
  // 检查是否在客户端环境
  if (typeof window === 'undefined') {
    return null
  }
  
  // 检查用户偏好设置
  const savedPreferences = localStorage.getItem('user-ad-preferences')
  let userPreferences = { showSidebarAds: true }
  
  if (savedPreferences) {
    try {
      const preferences = JSON.parse(savedPreferences)
      userPreferences = { showSidebarAds: preferences.showSidebarAds ?? true }
    } catch (error) {
      console.error('Failed to parse user ad preferences:', error)
    }
  }
  
  // 如果用户禁用了侧边栏广告，返回null
  if (!userPreferences.showSidebarAds) {
    return null
  }
  
  const savedConfig = localStorage.getItem('ad-config')
  let adConfig = defaultAdConfig
  
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig)
      adConfig = { ...defaultAdConfig, ...config }
    } catch (error) {
      console.error('Failed to parse ad config:', error)
    }
  }
  
  const ad = adConfig.sidebarNavAds[index]
  
  if (!ad || !ad.isActive) {
    return null
  }

  return {
    name: ad.title,
    description: ad.description || '',
    href: ad.clickUrl,
    adImage: ad.imageUrl,
    adTitle: ad.title,
    adDescription: ad.description || '',
    isAd: true
  }
}

// 侧栏导航广告组件（鼠标悬停显示图片）
interface SidebarNavAdProps {
  index: number
}

export const SidebarNavAd = ({ index }: SidebarNavAdProps) => {
  const { adsEnabled, shouldShowAd } = useAds()
  const { adConfig } = useAdConfig()
  const [userPreferences, setUserPreferences] = useState({ showSidebarAds: true })

  const loadUserPreferences = () => {
    if (typeof window === 'undefined') return
    const savedPreferences = localStorage.getItem('user-ad-preferences')
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences)
        setUserPreferences({ showSidebarAds: preferences.showSidebarAds ?? true })
      } catch (error) {
        console.error('Failed to parse user ad preferences:', error)
      }
    }
  }

  useEffect(() => {
    loadUserPreferences()
    
    // 监听用户偏好更新事件
    const handleUserPreferencesUpdate = () => {
      loadUserPreferences()
    }
    
    window.addEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
    
    return () => {
      window.removeEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
    }
  }, [])

  // 检查是否应该显示广告
  if (!adsEnabled || !userPreferences.showSidebarAds || !shouldShowAd(`sidebar-nav-${index}`)) {
    return null
  }

  const ad = adConfig.sidebarNavAds[index]
  
  if (!ad || !ad.isActive) {
    return null
  }

  return (
    <a
      href={ad.clickUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full p-3 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 group"
      title={ad.description || ad.title}
    >
      <div className="flex items-center space-x-3">
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="w-12 h-12 rounded object-cover"
        />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
            {ad.title}
          </h4>
          {ad.description && (
            <p className="text-xs text-gray-500 mt-1">
              {ad.description}
            </p>
          )}
        </div>
      </div>
    </a>
  )
}

// 广告配置管理 Hook
export const useAdConfig = () => {
  const [adConfig, setAdConfig] = useState<AdConfig>(defaultAdConfig)

  const loadConfig = () => {
    if (typeof window === 'undefined') return
    const savedConfig = localStorage.getItem('ad-config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setAdConfig({ ...defaultAdConfig, ...config })
      } catch (error) {
        console.error('Failed to parse ad config:', error)
      }
    }
  }

  useEffect(() => {
    loadConfig()
    
    // 监听配置更新事件
    const handleConfigUpdate = () => {
      loadConfig()
    }
    
    window.addEventListener('adConfigUpdated', handleConfigUpdate)
    
    return () => {
      window.removeEventListener('adConfigUpdated', handleConfigUpdate)
    }
  }, [])

  // 更新广告配置
  const updateAdConfig = (newConfig: Partial<AdConfig>) => {
    const updatedConfig = { ...adConfig, ...newConfig }
    setAdConfig(updatedConfig)
    
    // 检查是否在客户端环境
    if (typeof window !== 'undefined') {
      localStorage.setItem('ad-config', JSON.stringify(updatedConfig))
      // 触发自定义事件通知其他组件配置已更新
      window.dispatchEvent(new CustomEvent('adConfigUpdated'))
    }
  }

  // 切换首页横幅广告
  const toggleHomeBannerRow = (enabled: boolean) => {
    updateAdConfig({ showHomeBannerRow: enabled })
  }

  // 切换侧栏广告
  const toggleSidebarAds = (enabled: boolean) => {
    updateAdConfig({ showSidebarAds: enabled })
  }

  // 切换redirect页面广告
  const toggleRedirectAd = (enabled: boolean) => {
    updateAdConfig({ showRedirectAd: enabled })
  }

  return {
    adConfig,
    updateAdConfig,
    toggleHomeBannerRow,
    toggleSidebarAds,
    toggleRedirectAd
  }
}

// 广告配置面板组件
interface AdConfigPanelProps {
  onConfigUpdate?: () => void
}

export const AdConfigPanel = ({ onConfigUpdate }: AdConfigPanelProps = {}) => {
  const { adConfig, updateAdConfig, toggleHomeBannerRow, toggleSidebarAds, toggleRedirectAd } = useAdConfig()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const updateAdContent = (type: 'homeBannerAds' | 'sidebarAds' | 'sidebarNavAds', index: number, field: keyof AdContent, value: string | boolean) => {
    const ads = [...adConfig[type]]
    ads[index] = { ...ads[index], [field]: value }
    updateAdConfig({ [type]: ads })
    
    // 显示保存状态
    setSaveStatus('saving')
    setTimeout(() => setSaveStatus('saved'), 500)
    setTimeout(() => setSaveStatus('idle'), 2000)
    
    // 通知父组件配置已更新
    if (onConfigUpdate) {
      onConfigUpdate()
    }
  }

  const updateRedirectAdContent = (field: keyof AdContent, value: string | boolean) => {
    const updatedAd = { ...adConfig.redirectAd, [field]: value }
    updateAdConfig({ redirectAd: updatedAd })
    
    // 显示保存状态
    setSaveStatus('saving')
    setTimeout(() => setSaveStatus('saved'), 500)
    setTimeout(() => setSaveStatus('idle'), 2000)
    
    // 通知父组件配置已更新
    if (onConfigUpdate) {
      onConfigUpdate()
    }
  }

  const handleSaveAll = () => {
    setSaveStatus('saving')
    // 重新保存当前配置
    updateAdConfig(adConfig)
    setTimeout(() => setSaveStatus('saved'), 500)
    setTimeout(() => setSaveStatus('idle'), 2000)
    
    if (onConfigUpdate) {
      onConfigUpdate()
    }
  }

  return (
    <div className="p-4 bg-content1 rounded-lg shadow-sm border border-divider max-w-4xl">
      <h3 className="text-lg font-semibold text-foreground mb-4">广告设置</h3>
      
      <div className="space-y-6">
        {/* 广告开关 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">首页横幅广告</label>
            <input
              type="checkbox"
              checked={adConfig.showHomeBannerRow}
              onChange={(e) => toggleHomeBannerRow(e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">侧栏广告</label>
            <input
              type="checkbox"
              checked={adConfig.showSidebarAds}
              onChange={(e) => toggleSidebarAds(e.target.checked)}
              className="rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Redirect页面广告</label>
            <input
              type="checkbox"
              checked={adConfig.showRedirectAd}
              onChange={(e) => toggleRedirectAd(e.target.checked)}
              className="rounded"
            />
          </div>
        </div>

        {/* 首页横幅广告配置 */}
        <div>
          <h4 className="text-md font-medium text-foreground mb-3">首页横幅广告内容</h4>
          <div className="space-y-4">
            {adConfig.homeBannerAds.map((ad, index) => (
              <div key={ad.id} className="p-4 border border-divider rounded-lg bg-content2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">标题</label>
                    <input
                      type="text"
                      value={ad.title}
                      onChange={(e) => updateAdContent('homeBannerAds', index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">图片URL</label>
                    <input
                      type="url"
                      value={ad.imageUrl}
                      onChange={(e) => updateAdContent('homeBannerAds', index, 'imageUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                      placeholder="支持GIF格式"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">跳转链接</label>
                    <input
                      type="url"
                      value={ad.clickUrl}
                      onChange={(e) => updateAdContent('homeBannerAds', index, 'clickUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={ad.isActive}
                        onChange={(e) => updateAdContent('homeBannerAds', index, 'isActive', e.target.checked)}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm font-medium text-foreground">启用</span>
                    </label>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-foreground mb-1">描述</label>
                  <input
                    type="text"
                    value={ad.description || ''}
                    onChange={(e) => updateAdContent('homeBannerAds', index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 侧栏导航广告配置 */}
        <div>
          <h4 className="text-md font-medium text-foreground mb-3">侧栏导航广告内容</h4>
          <div className="space-y-4">
            {adConfig.sidebarNavAds.map((ad, index) => (
              <div key={ad.id} className="p-4 border border-divider rounded-lg bg-content2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">标题</label>
                    <input
                      type="text"
                      value={ad.title}
                      onChange={(e) => updateAdContent('sidebarNavAds', index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">图片URL</label>
                    <input
                      type="url"
                      value={ad.imageUrl}
                      onChange={(e) => updateAdContent('sidebarNavAds', index, 'imageUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                      placeholder="支持GIF格式"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">跳转链接</label>
                    <input
                      type="url"
                      value={ad.clickUrl}
                      onChange={(e) => updateAdContent('sidebarNavAds', index, 'clickUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={ad.isActive}
                        onChange={(e) => updateAdContent('sidebarNavAds', index, 'isActive', e.target.checked)}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm font-medium text-foreground">启用</span>
                    </label>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-foreground mb-1">描述</label>
                  <input
                    type="text"
                    value={ad.description || ''}
                    onChange={(e) => updateAdContent('sidebarNavAds', index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Redirect页面广告配置 */}
        <div>
          <h4 className="text-md font-medium text-foreground mb-3">Redirect页面广告内容</h4>
          <div className="p-4 border border-divider rounded-lg bg-content2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">标题</label>
                <input
                  type="text"
                  value={adConfig.redirectAd.title}
                  onChange={(e) => updateRedirectAdContent('title', e.target.value)}
                  className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">图片URL</label>
                <input
                  type="url"
                  value={adConfig.redirectAd.imageUrl}
                  onChange={(e) => updateRedirectAdContent('imageUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                  placeholder="支持GIF格式"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">跳转链接</label>
                <input
                  type="url"
                  value={adConfig.redirectAd.clickUrl}
                  onChange={(e) => updateRedirectAdContent('clickUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={adConfig.redirectAd.isActive}
                    onChange={(e) => updateRedirectAdContent('isActive', e.target.checked)}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm font-medium text-foreground">启用</span>
                </label>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-foreground mb-1">描述</label>
              <input
                type="text"
                value={adConfig.redirectAd.description || ''}
                onChange={(e) => updateRedirectAdContent('description', e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-md text-sm bg-background text-foreground"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-divider">
        <div className="flex items-center justify-between">
          <div className="text-xs text-foreground/60">
            <p>• 关闭广告类型后，对应位置的广告将不会显示</p>
            <p>• 配置修改后会自动保存到本地存储</p>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && (
              <span className="text-sm text-blue-600">保存中...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-sm text-green-600">✓ 已保存</span>
            )}
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Redirect页面广告组件（单个广告）
export const RedirectAd = ({ className = '' }: { className?: string }) => {
  const { adsEnabled, shouldShowAd } = useAds()
  const [adConfig, setAdConfig] = useState<AdConfig>(defaultAdConfig)
  const [userPreferences, setUserPreferences] = useState({ showRedirectAd: true })
  const [isLoaded, setIsLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const loadConfig = () => {
    if (typeof window === 'undefined') return
    
    try {
      const savedConfig = localStorage.getItem('ad-config')
      
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        console.log('RedirectAd - Raw saved config:', config)
        // 直接使用保存的配置，如果某些字段缺失则使用默认值
        const mergedConfig = {
          ...defaultAdConfig,
          ...config,
          // 确保数组字段正确合并
          homeBannerAds: config.homeBannerAds || defaultAdConfig.homeBannerAds,
          sidebarAds: config.sidebarAds || defaultAdConfig.sidebarAds,
          sidebarNavAds: config.sidebarNavAds || defaultAdConfig.sidebarNavAds,
          redirectAd: config.redirectAd || defaultAdConfig.redirectAd
        }
        console.log('RedirectAd - Merged config:', mergedConfig)
        setAdConfig(mergedConfig)
      } else {
        console.log('RedirectAd - No saved config, using default')
        setAdConfig(defaultAdConfig)
      }
      setIsLoaded(true)
    } catch (error) {
      console.error('Failed to load ad config:', error)
      setAdConfig(defaultAdConfig)
      setIsLoaded(true)
    }
  }

  const loadUserPreferences = () => {
    if (typeof window === 'undefined') return
    
    try {
      const savedPrefs = localStorage.getItem('user-ad-preferences')
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs)
        setUserPreferences({ showRedirectAd: true, ...prefs })
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error)
    }
  }

  useEffect(() => {
    loadConfig()
    loadUserPreferences()

    const handleConfigUpdate = () => {
      loadConfig()
      loadUserPreferences()
      setImageError(false) // 重置图片错误状态
    }

    // 监听localStorage变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ad-config') {
        loadConfig()
        setImageError(false) // 重置图片错误状态
      }
    }

    window.addEventListener('adConfigUpdated', handleConfigUpdate)
    window.addEventListener('userAdPreferencesUpdated', handleConfigUpdate)
    window.addEventListener('storage', handleStorageChange)

    // 定期检查配置更新（作为备用机制）
    const intervalId = setInterval(() => {
      loadConfig()
    }, 5000)

    return () => {
      window.removeEventListener('adConfigUpdated', handleConfigUpdate)
      window.removeEventListener('userAdPreferencesUpdated', handleConfigUpdate)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(intervalId)
    }
  }, [])

  // 等待配置加载完成
  if (!isLoaded) {
    return (
      <div className={`my-6 w-full ${className}`}>
        <div className="py-4">
          <div className="w-full h-24 bg-content2 rounded-lg flex items-center justify-center border border-divider">
            <span className="text-foreground/40 text-sm">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  // 检查是否应该显示广告（redirect页面广告不受用户关闭广告显示设置影响）
  if (!userPreferences.showRedirectAd || !adConfig.showRedirectAd) {
    return null
  }

  const ad = adConfig.redirectAd
  if (!ad || !ad.isActive) {
    return null
  }

  return (
    <div className={`my-6 w-full ${className}`}>
      <div className="py-4">
        <a
          href={ad.clickUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-lg overflow-hidden border border-divider hover:shadow-lg transition-all duration-200 group"
        >
          {ad.imageUrl && !imageError ? (
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-full h-auto group-hover:scale-105 transition-transform duration-200"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-32 bg-content2 flex items-center justify-center">
              <span className="text-foreground/60 text-sm">{ad.title}</span>
            </div>
          )}
        </a>
      </div>
    </div>
  )
}

// 使用示例：
// 在首页组件中使用：
// import { HomeBannerRowAd } from '~/components/ads/AdInterface'
// <HomeBannerRowAd className="container mx-auto" />
//
// 在侧栏中使用：
// import { SidebarAd } from '~/components/ads/AdInterface'
// <SidebarAd position="top" />
// <SidebarAd position="middle" />
// <SidebarAd position="bottom" />
//
// 在redirect页面中使用：
// import { RedirectAd } from '~/components/ads/AdInterface'
// <RedirectAd className="w-full" />
//
// 在设置页面中使用配置面板：
// import { AdConfigPanel } from '~/components/ads/AdInterface'
// <AdConfigPanel />