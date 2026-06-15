import { getKv } from '~/lib/redis'
import type { MigrationNoticeConfig } from '~/types/api/admin'

export const MIGRATION_NOTICE_REDIS_KEY = 'admin:setting:migration-notice'

export const getMigrationNoticeDefault = (): MigrationNoticeConfig => ({
  enabled: false,
  title: '',
  content: '',
  version: 0,
  updatedAt: ''
})

export const getMigrationNotice = async (): Promise<MigrationNoticeConfig> => {
  const json = await getKv(MIGRATION_NOTICE_REDIS_KEY)
  if (!json) {
    return getMigrationNoticeDefault()
  }

  try {
    const parsed = JSON.parse(json) as Partial<MigrationNoticeConfig>
    // 与默认值合并, 兼容历史上缺字段的旧记录
    return { ...getMigrationNoticeDefault(), ...parsed }
  } catch {
    return getMigrationNoticeDefault()
  }
}
