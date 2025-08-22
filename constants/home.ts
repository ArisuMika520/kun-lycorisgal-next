import { Tags, MessageSquare, FileText, Gamepad2, ToolCase, TextSearch } from 'lucide-react'
import { kunMoyuMoe } from '~/config/moyu-moe'
import type { LucideProps } from 'lucide-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'

interface HomeNavItem {
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
  >
  label: string
  href: string
  color: 'primary' | 'secondary' | 'success'
  isExternal: boolean
}

export const homeNavigationItems: HomeNavItem[] = [
  {
    icon: TextSearch,
    label: '教程',
    href: '/doc/teach/teachdoc',
    color: 'primary',
    isExternal: false
  },
  {
    icon: ToolCase,
    label: '工具',
    href: '/tag/1',
    color: 'secondary',
    isExternal: false
  },
  {
    icon: FileText,
    label: '文档',
    href: '/doc',
    color: 'success',
    isExternal: false
  }
]
