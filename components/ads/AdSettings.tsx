'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader } from '@heroui/card'
import { Switch } from '@heroui/switch'
import { Button } from '@heroui/button'
import { Divider } from '@heroui/divider'
import { Settings, Eye, EyeOff } from 'lucide-react'
import { useAds } from '~/hooks/useAds'

// 用户广告偏好接口
interface UserAdPreferences {
  showHomeBannerRow: boolean
  showSidebarAds: boolean
}

// 默认用户偏好
const defaultUserPreferences: UserAdPreferences = {
  showHomeBannerRow: true,
  showSidebarAds: true
}

export const AdSettings = () => {
  const { adsEnabled, toggleAds } = useAds()
  const [showSettings, setShowSettings] = useState(false)
  const [userPreferences, setUserPreferences] = useState<UserAdPreferences>(defaultUserPreferences)

  useEffect(() => {
    // 从 localStorage 加载用户偏好
    const savedPreferences = localStorage.getItem('user-ad-preferences')
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences)
        setUserPreferences({ ...defaultUserPreferences, ...preferences })
      } catch (error) {
        console.error('Failed to parse user ad preferences:', error)
      }
    }
  }, [])

  const updateUserPreference = (key: keyof UserAdPreferences, value: boolean) => {
    const newPreferences = { ...userPreferences, [key]: value }
    setUserPreferences(newPreferences)
    localStorage.setItem('user-ad-preferences', JSON.stringify(newPreferences))
    
    // 触发用户偏好更新事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('userAdPreferencesUpdated', {
        detail: newPreferences
      }))
    }
  }

  if (!showSettings) {
    return (
      <Button
        isIconOnly
        variant="light"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm border"
        onPress={() => setShowSettings(true)}
        title="广告设置"
      >
        <Settings className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="font-medium">广告设置</span>
          </div>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={() => setShowSettings(false)}
          >
            <EyeOff className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">显示广告</p>
              <p className="text-sm text-foreground/60">支持网站运营</p>
            </div>
            <Switch
              isSelected={adsEnabled}
              onValueChange={toggleAds}
              color="primary"
            />
          </div>

          {adsEnabled && (
            <>
              <Divider />
              
              <div className="space-y-3">
                <p className="font-medium text-sm">广告类型偏好</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">首页横幅广告</span>
                  <Switch
                    size="sm"
                    isSelected={userPreferences.showHomeBannerRow}
                    onValueChange={(value) => updateUserPreference('showHomeBannerRow', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">侧边栏广告</span>
                  <Switch
                    size="sm"
                    isSelected={userPreferences.showSidebarAds}
                    onValueChange={(value) => updateUserPreference('showSidebarAds', value)}
                  />
                </div>
              </div>
              
              <Divider />
              
              <div className="text-xs text-foreground/60 space-y-1">
                <p>• 广告帮助我们维持网站运营</p>
                <p>• 我们承诺提供相关且非侵入性的广告</p>
                <p>• 您可以随时调整这些设置</p>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

// 简化版广告控制按钮
export const AdToggleButton = () => {
  const { adsEnabled, toggleAds } = useAds()

  return (
    <Button
      variant="light"
      size="sm"
      startContent={adsEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      onPress={() => toggleAds(!adsEnabled)}
      className="text-xs"
    >
      {adsEnabled ? '隐藏广告' : '显示广告'}
    </Button>
  )
}