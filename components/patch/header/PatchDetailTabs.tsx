'use client'

import dynamic from 'next/dynamic'
import { startTransition, useEffect, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { Card, CardBody } from '@heroui/card'
import { Tab, Tabs } from '@heroui/tabs'
import { FolderOpenDot, MessageSquare, Sparkles } from 'lucide-react'
import { cn } from '~/utils/cn'
import { KunAdSlot } from '~/components/kun/ad/KunAdSlot'
import { kunGameDetailTopAds } from '~/config/ads'
import {
  PATCH_DETAIL_TAB_CHANGE_EVENT,
  type PatchDetailTabChangeDetail
} from './events'
import type { PatchDetailData, PatchDetailTabKey } from './types'
import styles from './patch-detail.module.css'

type VisitedTabState = Record<PatchDetailTabKey, boolean>

const DEFAULT_VISITED_TABS: VisitedTabState = {
  info: true,
  resources: false,
  comments: false
}

const getTabFromHash = (hash: string): PatchDetailTabKey | null => {
  if (hash === '#resources') {
    return 'resources'
  }

  if (hash === '#comments') {
    return 'comments'
  }

  return null
}

const markTabVisited = (
  currentTabs: VisitedTabState,
  tab: PatchDetailTabKey
): VisitedTabState => {
  if (currentTabs[tab]) {
    return currentTabs
  }

  return {
    ...currentTabs,
    [tab]: true
  }
}

const selectTab = (
  tab: PatchDetailTabKey,
  setSelectedTab: Dispatch<SetStateAction<PatchDetailTabKey>>,
  setVisitedTabs: Dispatch<SetStateAction<VisitedTabState>>
) => {
  startTransition(() => {
    setSelectedTab(tab)
    setVisitedTabs((currentTabs) => markTabVisited(currentTabs, tab))
  })
}

function PanelLoading({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <div className="h-5 w-32 rounded-full bg-default-200/80" />
      <div className="space-y-2 rounded-xl border border-default-100 bg-default-50/70 p-4">
        <div className="h-4 w-3/4 rounded-full bg-default-200/80" />
        <div className="h-4 w-full rounded-full bg-default-100" />
        <div className="h-4 w-5/6 rounded-full bg-default-100" />
      </div>
      <p className="text-sm text-default-500">{title}</p>
    </div>
  )
}

const LazyResources = dynamic(
  () =>
    import('~/components/patch/resource/Resource').then((mod) => mod.Resources),
  {
    loading: () => <PanelLoading title="资源分区加载中..." />
  }
)

const LazyComments = dynamic(
  () =>
    import('~/components/patch/comment/Comments').then((mod) => mod.Comments),
  {
    loading: () => <PanelLoading title="评论分区加载中..." />
  }
)

const TabSection = ({
  title,
  icon,
  children
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) => {
  return (
    <Card
      className={cn(
        styles.sectionCard,
        'overflow-hidden rounded-large border border-default-100 bg-content1/95 shadow-sm'
      )}
    >
      <CardBody className="gap-4 p-4 sm:gap-5 sm:p-5">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h2>
          </div>
        </div>
        {children}
      </CardBody>
    </Card>
  )
}

interface Props {
  data: PatchDetailData
  children: ReactNode
}

export const PatchDetailTabs = ({ data, children }: Props) => {
  const [selectedTab, setSelectedTab] = useState<PatchDetailTabKey>('info')
  const [visitedTabs, setVisitedTabs] =
    useState<VisitedTabState>(DEFAULT_VISITED_TABS)

  useEffect(() => {
    const syncFromHash = () => {
      const nextTab = getTabFromHash(window.location.hash)
      if (!nextTab) {
        return
      }

      selectTab(nextTab, setSelectedTab, setVisitedTabs)
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)

    return () => {
      window.removeEventListener('hashchange', syncFromHash)
    }
  }, [])

  useEffect(() => {
    const handleTabChange = (event: Event) => {
      const detail = (event as CustomEvent<PatchDetailTabChangeDetail>).detail
      if (!detail?.tab) {
        return
      }

      selectTab(detail.tab, setSelectedTab, setVisitedTabs)
    }

    window.addEventListener(
      PATCH_DETAIL_TAB_CHANGE_EVENT,
      handleTabChange as EventListener
    )

    return () => {
      window.removeEventListener(
        PATCH_DETAIL_TAB_CHANGE_EVENT,
        handleTabChange as EventListener
      )
    }
  }, [])

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number
      cancelIdleCallback?: (handle: number) => void
    }

    const prefetchPanels = () => {
      void import('~/components/patch/resource/Resource')
      void import('~/components/patch/comment/Comments')
    }

    if (win.requestIdleCallback) {
      const idleId = win.requestIdleCallback(
        () => {
          prefetchPanels()
        },
        { timeout: 2000 }
      )

      return () => {
        win.cancelIdleCallback?.(idleId)
      }
    }

    const timer = window.setTimeout(() => {
      prefetchPanels()
    }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <Card className="overflow-hidden rounded-large border border-default-100 bg-content1/90 shadow-sm backdrop-blur">
      <CardBody className="p-2 sm:p-3">
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) =>
            selectTab(key as PatchDetailTabKey, setSelectedTab, setVisitedTabs)
          }
          fullWidth
          variant="solid"
          aria-label="游戏详情分区"
          classNames={{
            base: 'w-full',
            tabList:
              'grid w-full grid-cols-3 gap-1 rounded-large bg-default-100/80 p-1',
            panel: 'px-2 pb-2 pt-0 sm:px-3 sm:pb-3',
            cursor: 'w-full rounded-lg bg-content1 shadow-sm',
            tab: 'h-11 min-w-0 px-1.5 sm:h-14 sm:px-3',
            tabContent:
              'truncate text-xs font-semibold text-default-600 group-data-[selected=true]:text-foreground sm:text-sm'
          }}
          id="patch-detail-tabs"
        >
          <Tab
            key="info"
            title={
              <div className="flex items-center gap-2">
                <Sparkles className="hidden size-4 sm:block" />
                <span>游戏信息</span>
              </div>
            }
            className="p-0"
          >
            {children}
          </Tab>

          <Tab
            key="resources"
            title={
              <div className="flex items-center gap-2">
                <FolderOpenDot className="hidden size-4 sm:block" />
                <span>资源链接</span>
              </div>
            }
            className="p-0"
          >
            <div className="space-y-5 pt-5">
              {/* 资源链接 Tab 顶部广告位(Tab 栏与面板之间, 一行两列) */}
              <KunAdSlot ads={kunGameDetailTopAds} />
              <TabSection
                title="资源链接"
                icon={<FolderOpenDot className="size-5 text-default-500" />}
              >
                {visitedTabs.resources ? (
                  <LazyResources
                    id={data.patch.id}
                    vndbId={data.patch.vndbId || ''}
                  />
                ) : null}
              </TabSection>
            </div>
          </Tab>

          <Tab
            key="comments"
            title={
              <div className="flex items-center gap-2">
                <MessageSquare className="hidden size-4 sm:block" />
                <span>游戏评论</span>
              </div>
            }
            className="p-0"
          >
            <div className="pt-5">
              <TabSection
                title="游戏评论"
                icon={<MessageSquare className="size-5 text-default-500" />}
              >
                {visitedTabs.comments ? (
                  <LazyComments id={data.patch.id} />
                ) : null}
              </TabSection>
            </div>
          </Tab>
        </Tabs>
      </CardBody>
    </Card>
  )
}
