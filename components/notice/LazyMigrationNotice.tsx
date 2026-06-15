'use client'

import dynamic from 'next/dynamic'

// 仅客户端渲染: 避免 SSR 读取 storage 造成水合不一致, 并让弹窗逻辑延迟加载
const MigrationNoticeModal = dynamic(
  () =>
    import('~/components/notice/MigrationNoticeModal').then(
      (mod) => mod.MigrationNoticeModal
    ),
  { ssr: false }
)

export const LazyMigrationNotice = () => {
  return <MigrationNoticeModal />
}
