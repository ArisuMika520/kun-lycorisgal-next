'use client'

import { useSettingStore } from '~/store/settingStore'
import { Shield, Eye, AlertTriangle } from 'lucide-react'
import { Card, CardBody } from '@heroui/react'

export const NSFWStatusNotice = () => {
  const settings = useSettingStore((state) => state.data)
  const nsfwSetting = settings.kunNsfwEnable

  if (nsfwSetting === 'sfw') {
    return (
      <Card className="bg-orange-50 border-orange-200 border-1">
        <CardBody className="p-2">
          <div className="flex items-start gap-2">
            <Shield className="size-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-orange-800 leading-tight">
              <div className="font-medium mb-0.5">部分 Galgame 已被隐藏</div>
              <div>
                网站未启用 NSFW, 部分 Galgame 不可见, 要查看所有 Galgame, 请点击右上角头像打开 NSFW
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (nsfwSetting === 'nsfw' || nsfwSetting === 'all') {
    return (
      <Card className="bg-pink-50 border-pink-200 border-1">
        <CardBody className="p-2">
          <div className="flex items-start gap-2">
            <Eye className="size-4 text-pink-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-pink-800 leading-tight">
              <div className="font-medium mb-0.5">网站已进入♡全面涩涩模式♡</div>
              <div>
                网站已启用 NSFW, 杂鱼~♡ 杂鱼~♡, 请注意您周围没有人
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  return null
}