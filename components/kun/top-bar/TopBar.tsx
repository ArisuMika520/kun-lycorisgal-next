'use client'

import { useEffect, useState } from 'react'
import {
  Navbar,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
} from '@heroui/navbar'
import Link from 'next/link'
import { KunTopBarBrand } from './Brand'
import { KunTopBarUser } from './User'
import { usePathname } from 'next/navigation'
import { kunNavItem } from '~/constants/top-bar'
import { KunMobileMenu } from './KunMobileMenu'

export const KunTopBar = () => {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  return (
    <Navbar
      maxWidth="full"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      classNames={{ wrapper: 'px-3 sm:px-6' }}
    >
      {/* 左侧内容区 (Logo + 导航链接) */}
      <NavbarContent justify="start">
        <NavbarMenuToggle className="sm:hidden" />
        <KunTopBarBrand />
        <div className="hidden sm:flex gap-4">
          {kunNavItem.map((item) => (
            <NavbarItem key={item.href} isActive={pathname === item.href}>
              <Link
                className={
                  pathname === item.href ? 'text-primary' : 'text-foreground'
                }
                href={item.href}
              >
                {item.name}
              </Link>
            </NavbarItem>
          ))}
        </div>
      </NavbarContent>

      {/* 右侧内容区 (用户操作) */}
      <NavbarContent justify="end">
        <KunTopBarUser />
      </NavbarContent>

      {/* 移动端展开的菜单 */}
      <KunMobileMenu />
    </Navbar>
  )
}