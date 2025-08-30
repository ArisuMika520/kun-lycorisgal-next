'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '~/utils/cn'
import {
  Gamepad2,
  FileText,
  MessageSquare,
  Tags,
  BookUser,
  Home,
  ChevronsLeft,
  ChevronsRight,
  Users,
  Building,
  MessagesSquare,
  Trophy,
  CheckSquare,
  Hash,
  HeartMinus
} from 'lucide-react'
import { Button } from '@heroui/button'
import { Tooltip } from '@heroui/tooltip'
import { Image } from '@heroui/image'
import { NSFWStatusNotice } from '~/components/kun/sidebar/NSFWStatusNotice'
import { AdNavItem } from '~/components/ads/AdNavItem'
import { SidebarAd, getSidebarNavAdData } from '~/components/ads/AdInterface'

const navSections = [
  {
    title: '推荐内容',
    items: [], // 将在组件内部动态填充
  },
  {
    title: '核心功能',
    items: [
      //{
      //  name: '首页',
      //  description: '网站首页',
      //  href: '/',
      //  icon: Home,
      //  popover: {
      //    title: '返回首页',
      //    description: '点击回到 LyCorisGal 主页面',
      //    image: '/touchgal.avif',
      // },
      //},
      { name: '首页', description: '网站首页', href: '/', icon: Home },
      { name: 'Galgame', description: 'Galgame 本体获取', href: '/galgame', icon: Gamepad2 },
      { name: '补丁和存档', description: '游戏补丁与存档', href: '/resource', icon: FileText },
    ],
  },
  {
    title: '游戏信息',
    items: [
      { name: '游戏标签', description: '按标签浏览游戏', href: '/tag', icon: Tags },
    ],
  },
  {
    title: '社区交流',
    items: [
      { name: '评论列表', description: '最新评论动态', href: '/comment', icon: MessagesSquare },
      { name: '话题列表', description: '最新话题', href: '/topic', icon: Hash },
    ],
  },
  {
    title: '帮助支持',
    items: [
      { name: '帮助文档', description: '使用说明文档', href: '/doc', icon: BookUser },
    ],
  },
  {
    title: '其他',
    items: [
      { name: '友情链接', description: '可爱的好朋友们！', href: '/friend-link', icon: HeartMinus },
    ],
  },
]

const SidebarPopoverContent = ({ popover }: { popover: any }) => (
  <div className="px-2 py-2 max-w-[320px]">
    <p className="font-bold text-foreground">{popover.title}</p>
    <p className="text-xs text-default-600 mb-2">{popover.description}</p>
    <Image
      src={popover.image}
      alt={popover.title}
      // 2. 调整 width 来改变图片宽度
      width={320}
      radius="md"
    />
  </div>
)

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>
}

export const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  const pathname = usePathname()
  const [recommendedItems, setRecommendedItems] = useState<any[]>([])
  
  useEffect(() => {
    // 获取推荐内容导航项（包含广告）
    const getRecommendedItems = () => {
      const items = []
      
      // 添加广告导航项
      for (let i = 0; i < 3; i++) {
        const adData = getSidebarNavAdData(i)
        if (adData) {
          items.push({
            ...adData,
            icon: i === 0 ? Trophy : i === 1 ? Users : CheckSquare
          })
        }
      }
      
      return items
    }
    
    setRecommendedItems(getRecommendedItems())
    
    // 监听localStorage变化和自定义事件
    const handleStorageChange = () => {
      setRecommendedItems(getRecommendedItems())
    }
    
    const handleAdConfigUpdate = () => {
      setRecommendedItems(getRecommendedItems())
    }
    
    const handleUserPreferencesUpdate = () => {
      setRecommendedItems(getRecommendedItems())
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('adConfigUpdated', handleAdConfigUpdate)
      window.addEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
      
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('adConfigUpdated', handleAdConfigUpdate)
        window.removeEventListener('userAdPreferencesUpdated', handleUserPreferencesUpdate)
      }
    }
  }, [])

  return (
    <aside
      className={cn(
        'hidden sm:flex flex-col bg-background border-r border-divider transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="h-24 flex items-center">
        {!isCollapsed && (
          <div className="px-4 w-full">
            <NSFWStatusNotice />
          </div>
        )}
      </div>
      
      <div className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide">
        {navSections.map((section, index) => {
          // 为推荐内容部分使用动态的recommendedItems
          const items = section.title === '推荐内容' ? recommendedItems : section.items
          
          return (
            <div key={section.title}>
              <div className={cn(!isCollapsed && 'mb-2')}>
                {index > 0 && (
                  <div
                    className={cn(
                      'transition-opacity my-2 border-t border-divider',
                      isCollapsed && 'mx-auto w-4/5'
                    )}
                  />
                )}
                <h2
                  className={cn(
                    'text-xs font-semibold text-default-400 uppercase px-2 py-1 transition-opacity duration-300',
                    isCollapsed && 'opacity-0 h-0 p-0 m-0 hidden'
                  )}
                >
                  {section.title}
                </h2>
                <ul className="space-y-1 font-medium">
              {items.map((item: any) => {
                // 如果是广告项，使用 AdNavItem 组件
                if (item.isAd) {
                  return (
                    <li key={item.name}>
                      <AdNavItem
                        name={item.name}
                        description={item.description}
                        href={item.href}
                        icon={item.icon}
                        adImage={item.adImage}
                        adTitle={item.adTitle}
                        adDescription={item.adDescription}
                        isActive={pathname === item.href}
                        isCollapsed={isCollapsed}
                      />
                    </li>
                  )
                }

                // 普通导航项的原有逻辑
                const linkContent = (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center p-2 rounded-lg hover:bg-default-100 group',
                      pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'w-5 h-5 transition duration-75 text-default-500 group-hover:text-foreground',
                        pathname === item.href ? 'text-primary-foreground' : ''
                      )}
                    />
                    <div className={cn('flex flex-col ms-3', isCollapsed && 'hidden')}>
                      <span className="text-sm">{item.name}</span>
                      <span className="text-xs text-default-500">{item.description}</span>
                    </div>
                  </Link>
                )

                return (
                  <li key={item.name}>
                    {isCollapsed ? (
                      <Tooltip content={item.name} placement="right">
                        <div className="flex justify-center">{linkContent}</div>
                      </Tooltip>
                    ) : item.popover ? (
                      <Tooltip
                        content={<SidebarPopoverContent popover={item.popover} />}
                        placement="right"
                        delay={100}
                        closeDelay={100}
                        // 3. 添加 classNames 属性来定义背景样式
                        classNames={{
                          content: 'p-0 bg-background/70 backdrop-blur-md border border-divider',
                        }}
                      >
                        {linkContent}
                      </Tooltip>
                    ) : (
                      linkContent
                    )}
                  </li>
                )
              })}
                </ul>
              </div>
            </div>
          )
        })}
      </div>


      
      <div className="p-3 mt-auto border-t border-divider">
        <Button
          isIconOnly={isCollapsed}
          variant="ghost"
          className="w-full justify-center data-[is-icon-only=false]:justify-start"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          <span className={cn('ms-2 transition-opacity', isCollapsed && 'hidden')}>
            收起
          </span>
        </Button>
      </div>
    </aside>
  )
}