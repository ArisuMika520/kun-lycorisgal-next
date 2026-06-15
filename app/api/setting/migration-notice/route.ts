import { NextResponse } from 'next/server'
import { getMigrationNotice } from '~/app/api/admin/setting/migration-notice/getMigrationNotice'
import type { MigrationNoticeConfig } from '~/types/api/admin'

// 公开接口: 任何访客(含未登录)都需读取迁移公告, 因此不做鉴权。
// 关闭时不返回标题/正文, 避免泄露尚未发布的草稿内容。
export const GET = async () => {
  const config = await getMigrationNotice()

  if (!config.enabled) {
    const closed: MigrationNoticeConfig = {
      enabled: false,
      title: '',
      content: '',
      version: config.version,
      updatedAt: ''
    }
    return NextResponse.json(closed)
  }

  return NextResponse.json(config)
}
