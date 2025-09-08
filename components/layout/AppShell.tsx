'use client'

import { useState } from 'react'
import { Sidebar } from '~/components/layout/Sidebar'
import { KunFooter } from '~/components/kun/Footer'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className="flex flex-col flex-1 w-0 overflow-y-auto">
        <div className="flex-grow px-4 sm:px-6 lg:px-8">{children}</div>
        <KunFooter />
      </div>
    </div>
  )
}