'use client'

import { useState, useEffect } from 'react'
import { HomeBannerRowAd, AdConfigPanel, getSidebarNavAdData } from '~/components/ads/AdInterface'
import { AdNavItem } from '~/components/ads/AdNavItem'
import { Trophy, Users, CheckSquare } from 'lucide-react'

export default function AdsManagementPage() {
  const [sidebarNavAds, setSidebarNavAds] = useState<any[]>([])
  
  const loadSidebarNavAds = () => {
    const ads = []
    for (let i = 0; i < 3; i++) {
      const adData = getSidebarNavAdData(i)
      if (adData) {
        ads.push({ ...adData, index: i })
      }
    }
    setSidebarNavAds(ads)
  }
  
  useEffect(() => {
    // 在客户端加载侧栏导航广告数据
    loadSidebarNavAds()
    
    // 监听localStorage变化和自定义事件
    const handleStorageChange = () => {
      loadSidebarNavAds()
    }
    
    const handleAdConfigUpdate = () => {
      loadSidebarNavAds()
    }
    
    const handleUserPreferencesUpdate = () => {
      loadSidebarNavAds()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('adConfigUpdated', handleAdConfigUpdate)
    window.addEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('adConfigUpdated', handleAdConfigUpdate)
      window.removeEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
    }
  }, [])
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">广告管理</h1>
        
        {/* 广告配置面板 */}
        <div className="mb-8">
          <AdConfigPanel onConfigUpdate={loadSidebarNavAds} />
        </div>
        
        {/* 广告预览区域 */}
        <div className="bg-content1 rounded-lg shadow-sm border border-divider p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">广告预览</h2>
          
          <div className="space-y-8">
            {/* 首页横幅广告预览 */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">首页横幅广告</h3>
              <div className="border-2 border-dashed border-divider rounded-lg p-4">
                <HomeBannerRowAd />
              </div>
            </div>
            

            
            {/* 侧栏导航广告预览 */}
             <div>
               <h3 className="text-lg font-medium text-foreground mb-4">侧栏导航广告</h3>
               <div className="space-y-2 max-w-xs">
                 {sidebarNavAds.map((adData) => (
                   <AdNavItem
                     key={adData.index}
                     name={adData.name}
                     description={adData.description}
                     href={adData.href}
                     icon={adData.index === 0 ? Trophy : adData.index === 1 ? Users : CheckSquare}
                     adImage={adData.adImage || ''}
                     adTitle={adData.adTitle || adData.name}
                     adDescription={adData.adDescription || adData.description || ''}
                     isActive={false}
                     isCollapsed={false}
                   />
                 ))}
               </div>
             </div>
          </div>
        </div>
        
        {/* 使用说明 */}
        <div className="mt-8 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-3">使用说明</h3>
          <div className="text-primary-800 dark:text-primary-100 space-y-2">
            <p>• <strong>图片URL：</strong>支持各种图片格式，包括GIF动图</p>
            <p>• <strong>跳转链接：</strong>点击广告时跳转的目标URL</p>
            <p>• <strong>启用状态：</strong>控制广告是否显示</p>
            <p>• <strong>自动保存：</strong>配置会自动保存到浏览器本地存储</p>
            <p>• <strong>响应式：</strong>广告会根据屏幕尺寸自动调整</p>
          </div>
        </div>
      </div>
    </div>
  )
}