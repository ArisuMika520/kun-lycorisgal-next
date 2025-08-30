'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getPageAds, adSpacing, type AdPlacement } from '~/components/ads/AdConfig'

interface UseAdsOptions {
  enabled?: boolean
  respectUserPreferences?: boolean
}

export const useAds = (options: UseAdsOptions = {}) => {
  const { enabled = true, respectUserPreferences = true } = options
  const pathname = usePathname()
  const [adsEnabled, setAdsEnabled] = useState(enabled)
  const [closedAds, setClosedAds] = useState<Set<string>>(new Set())
  const [pageAds, setPageAds] = useState<AdPlacement[]>([])

  // 检查用户偏好设置
  const loadUserPreferences = () => {
    if (respectUserPreferences && typeof window !== 'undefined') {
      const userPreference = localStorage.getItem('ads-enabled')
      if (userPreference !== null) {
        setAdsEnabled(userPreference === 'true')
      }
    }
  }

  useEffect(() => {
    loadUserPreferences()
    
    // 监听用户偏好更新事件
    const handleUserPreferencesUpdate = () => {
      loadUserPreferences()
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
      
      return () => {
        window.removeEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
      }
    }
  }, [respectUserPreferences])

  // 获取当前页面的广告配置
  useEffect(() => {
    if (adsEnabled) {
      const ads = getPageAds(pathname)
      setPageAds(ads)
    } else {
      setPageAds([])
    }
  }, [pathname, adsEnabled])

  // 关闭广告
  const closeAd = (adId: string) => {
    setClosedAds(prev => new Set([...prev, adId]))
    // 可选：保存到 localStorage
    const closedAdsList = Array.from(closedAds)
    closedAdsList.push(adId)
    localStorage.setItem('closed-ads', JSON.stringify(closedAdsList))
  }

  // 切换广告开关
  const toggleAds = (enabled: boolean) => {
    setAdsEnabled(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem('ads-enabled', enabled.toString())
      // 触发用户偏好更新事件
      window.dispatchEvent(new CustomEvent('userAdPreferencesUpdated'))
    }
  }

  // 检查广告是否应该显示
  const shouldShowAd = (adId: string): boolean => {
    return adsEnabled && !closedAds.has(adId)
  }



  return {
    adsEnabled,
    pageAds: pageAds.filter(ad => shouldShowAd(ad.id)),
    closeAd,
    toggleAds,
    shouldShowAd
  }
}

// 广告性能监控 Hook
export const useAdMetrics = () => {
  const [metrics, setMetrics] = useState({
    impressions: 0,
    clicks: 0,
    closures: 0
  })

  const trackImpression = (adId: string) => {
    setMetrics(prev => ({ ...prev, impressions: prev.impressions + 1 }))
    // 可以发送到分析服务
    console.log(`Ad impression: ${adId}`)
  }

  const trackClick = (adId: string) => {
    setMetrics(prev => ({ ...prev, clicks: prev.clicks + 1 }))
    console.log(`Ad click: ${adId}`)
  }

  const trackClosure = (adId: string) => {
    setMetrics(prev => ({ ...prev, closures: prev.closures + 1 }))
    console.log(`Ad closed: ${adId}`)
  }

  return {
    metrics,
    trackImpression,
    trackClick,
    trackClosure
  }
}