'use client'

import dynamic from 'next/dynamic'
import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import type { Dispatch, KeyboardEvent, ReactNode, SetStateAction } from 'react'
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

const TABS: Array<{ key: PatchDetailTabKey; label: string }> = [
  { key: 'info', label: '概述' },
  { key: 'resources', label: '资源' },
  { key: 'comments', label: '评论' }
]

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

const writeTabHash = (tab: PatchDetailTabKey) => {
  const { pathname, search, hash: currentHash } = window.location
  let nextHash = ''
  if (tab === 'resources') {
    nextHash = '#resources'
  } else if (tab === 'comments') {
    nextHash = '#comments'
  }

  const next = `${pathname}${search}${nextHash}`
  const current = `${pathname}${search}${currentHash}`
  if (next === current) {
    return
  }

  window.history.replaceState(window.history.state, '', next)
}

const selectTab = (
  tab: PatchDetailTabKey,
  setSelectedTab: Dispatch<SetStateAction<PatchDetailTabKey>>,
  setVisitedTabs: Dispatch<SetStateAction<VisitedTabState>>
) => {
  writeTabHash(tab)
  startTransition(() => {
    setSelectedTab(tab)
    setVisitedTabs((currentTabs) => markTabVisited(currentTabs, tab))
  })
}

const focusTabButton = (tab: PatchDetailTabKey) => {
  document.getElementById(`patch-detail-tab-${tab}`)?.focus()
}

const handleTabKeyDown = (
  event: KeyboardEvent<HTMLButtonElement>,
  current: PatchDetailTabKey,
  setSelectedTab: Dispatch<SetStateAction<PatchDetailTabKey>>,
  setVisitedTabs: Dispatch<SetStateAction<VisitedTabState>>
) => {
  const currentIndex = TABS.findIndex((item) => item.key === current)
  let nextIndex = currentIndex

  if (event.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
  } else if (event.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % TABS.length
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = TABS.length - 1
  } else {
    return
  }

  event.preventDefault()

  const nextTab = TABS[nextIndex]
  selectTab(nextTab.key, setSelectedTab, setVisitedTabs)
  focusTabButton(nextTab.key)
}

function PanelLoading({ title }: { title: string }) {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingBar} />
      <div className={styles.loadingBlock} />
      <p className={styles.emptyCopy}>{title}</p>
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

interface Props {
  data: PatchDetailData
  children: ReactNode
}

export const PatchDetailTabs = ({ data, children }: Props) => {
  const tabListRef = useRef<HTMLDivElement>(null)
  const panelMotion = useRef(false)
  const [indicator, setIndicator] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const [indicatorMotion, setIndicatorMotion] = useState(false)

  useEffect(() => {
    panelMotion.current = true
  }, [])

  useEffect(() => {
    if (!indicator || indicatorMotion) {
      return
    }

    setIndicatorMotion(true)
  }, [indicator, indicatorMotion])

  const [selectedTab, setSelectedTab] = useState<PatchDetailTabKey>('info')
  const [visitedTabs, setVisitedTabs] =
    useState<VisitedTabState>(DEFAULT_VISITED_TABS)

  useLayoutEffect(() => {
    const list = tabListRef.current
    if (!list) {
      return
    }

    const measure = () => {
      const selected = list.querySelector<HTMLElement>('[aria-selected="true"]')
      if (!selected) {
        return
      }

      const next = {
        x: selected.offsetLeft,
        y: selected.offsetTop,
        width: selected.offsetWidth,
        height: selected.offsetHeight
      }
      setIndicator((current) =>
        current &&
        current.x === next.x &&
        current.y === next.y &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    for (const button of list.querySelectorAll('button')) {
      observer.observe(button)
    }

    return () => observer.disconnect()
  }, [selectedTab])

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
      focusTabButton(detail.tab)
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
    <div className={styles.tabs} id="patch-detail-tabs">
      <div
        ref={tabListRef}
        className={styles.tabList}
        role="tablist"
        aria-label="游戏详情分区"
      >
        {indicator ? (
          <span
            className={
              indicatorMotion
                ? styles.tabIndicator
                : `${styles.tabIndicator} ${styles.tabIndicatorInstant}`
            }
            aria-hidden="true"
            style={{
              width: indicator.width,
              height: indicator.height,
              transform: `translate(${indicator.x}px, ${indicator.y}px)`
            }}
          />
        ) : null}
        {TABS.map((tab) => {
          const selected = selectedTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`patch-detail-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`patch-detail-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? styles.tabSelected : styles.tab}
              onClick={() => selectTab(tab.key, setSelectedTab, setVisitedTabs)}
              onKeyDown={(event) =>
                handleTabKeyDown(
                  event,
                  tab.key,
                  setSelectedTab,
                  setVisitedTabs
                )
              }
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id="patch-detail-panel-info"
        aria-labelledby="patch-detail-tab-info"
        hidden={selectedTab !== 'info'}
        className={
          selectedTab === 'info' && panelMotion.current
            ? `${styles.panel} ${styles.panelIn}`
            : styles.panel
        }
      >
        {children}
      </div>

      <div
        role="tabpanel"
        id="patch-detail-panel-resources"
        aria-labelledby="patch-detail-tab-resources"
        hidden={selectedTab !== 'resources'}
        className={
          selectedTab === 'resources' && panelMotion.current
            ? `${styles.panel} ${styles.panelIn}`
            : styles.panel
        }
      >
        {visitedTabs.resources ? (
          <div className={styles.resourceStack}>
            <KunAdSlot ads={kunGameDetailTopAds} />
            <LazyResources
              id={data.patch.id}
              vndbId={data.patch.vndbId || ''}
            />
          </div>
        ) : null}
      </div>

      <div
        role="tabpanel"
        id="patch-detail-panel-comments"
        aria-labelledby="patch-detail-tab-comments"
        hidden={selectedTab !== 'comments'}
        className={
          selectedTab === 'comments' && panelMotion.current
            ? `${styles.panel} ${styles.panelIn}`
            : styles.panel
        }
      >
        {visitedTabs.comments ? <LazyComments id={data.patch.id} /> : null}
      </div>
    </div>
  )
}
