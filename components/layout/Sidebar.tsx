'use client'

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
  HeartMinus,
  Eye,
  EyeOff,
  Shield,
  ExternalLink,
  Star
} from 'lucide-react'
import { Button } from '@heroui/button'
import { Tooltip } from '@heroui/tooltip'
import { Image } from '@heroui/image'
import { useSettingStore } from '~/store/settingStore'

const navSections = [
  {
    title: '推荐内容',
    items: [
      //{
      //  name: 'AD1',
      //  description: 'AD',
      //  href: 'https://www.bilibili.com/',
      //  icon: Star,
      //  popover: {
      //    title: '广告示例',
      //    description: '广告示例',
      //    image: '/lycorisgal.png',
      // },
      //},
    ],
  },
  {
    title: '核心功能',
    items: [
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
  const settings = useSettingStore((state) => state.data)

  const NSFWNotice = () => {
    if (isCollapsed) return null
    
    const isSFW = settings.kunNsfwEnable === 'sfw'
    const isNSFW = settings.kunNsfwEnable === 'nsfw'
    const isAll = settings.kunNsfwEnable === 'all'
    
    if (isSFW) {
      return (
        <div className="mx-3 mb-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-orange-700 dark:text-orange-300">
              <div className="font-medium mb-1">部分 Galgame 已被隐藏</div>
              <div className="text-orange-600 dark:text-orange-400">
                网站未启用 NSFW, 部分 Galgame 不可见, 要查看所有 Galgame, 请在网站右上角设置打开 NSFW
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    if (isNSFW || isAll) {
      return (
        <div className="mx-3 mb-4 p-3 bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Eye className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-pink-700 dark:text-pink-300">
              <div className="font-medium mb-1">网站已进入♡全面涩涩模式♡</div>
              <div className="text-pink-600 dark:text-pink-400">
                网站已启用 NSFW, 杂鱼~♡ 杂鱼~♡, 请注意您周围没有人
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return null
  }

  return (
    <aside
      className={cn(
        'hidden sm:flex flex-col bg-background border-r border-divider transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="pt-4 pb-2">
        <NSFWNotice />
      </div>
      <div className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide">
        {navSections.map((section, index) => {
          // 广告区域特殊处理
          const isAdSection = section.title === '推荐内容'
          
          return (
            <div key={section.title} className={cn(
              !isCollapsed && 'mb-2',
              isAdSection && 'mb-4 mx-1 p-3 bg-default-50 dark:bg-default-100/10 border border-pink-200 dark:border-pink-400/50 rounded-lg shadow-sm backdrop-blur-sm'
            )}>
              {index > 0 && !isAdSection && (
                <div
                  className={cn(
                    'transition-opacity my-2 border-t border-divider',
                    isCollapsed && 'mx-auto w-4/5'
                  )}
                />
              )}
              <h2
                className={cn(
                  'text-xs font-semibold uppercase px-2 py-1 transition-opacity duration-300',
                  isAdSection ? 'text-default-600 dark:text-default-300 font-bold' : 'text-default-400',
                  isCollapsed && 'opacity-0 h-0 p-0 m-0 hidden'
                )}
              >
                {isAdSection ? '✨ ' + section.title : section.title}
              </h2>
            <ul className="space-y-1 font-medium">
              {section.items.map((item: any) => {
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
                        'w-5 h-5 transition duration-75',
                        isAdSection 
                          ? 'text-primary group-hover:text-pink-600 dark:text-primary dark:group-hover:text-pink-300'
                          : 'text-default-500 group-hover:text-foreground',
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
        )})}
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