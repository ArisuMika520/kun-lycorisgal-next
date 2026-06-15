import { NextRequest, NextResponse } from 'next/server'
import { kunParsePutBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { adminUpdateMigrationNoticeSchema } from '~/validations/admin'
import { setKv } from '~/lib/redis'
import {
  getMigrationNotice,
  MIGRATION_NOTICE_REDIS_KEY
} from './getMigrationNotice'
import type { MigrationNoticeConfig } from '~/types/api/admin'

export const GET = async (req: NextRequest) => {
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }
  if (payload.role < 3) {
    return NextResponse.json('本页面仅管理员可访问')
  }

  const config = await getMigrationNotice()
  return NextResponse.json(config)
}

export const PUT = async (req: NextRequest) => {
  const input = await kunParsePutBody(req, adminUpdateMigrationNoticeSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }

  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }
  if (payload.role < 3) {
    return NextResponse.json('本页面仅管理员可访问')
  }

  const current = await getMigrationNotice()

  // 标题或正文发生变化即视为"新公告", 自增版本号让所有人(含已确定/不再通知者)重新看到;
  // 仅切换开关 / 重复保存相同内容时不变, 避免对已读用户重复打扰。
  const contentChanged =
    input.title !== current.title || input.content !== current.content
  const version =
    current.version < 1
      ? 1
      : contentChanged
        ? current.version + 1
        : current.version

  const next: MigrationNoticeConfig = {
    enabled: input.enabled,
    title: input.title,
    content: input.content,
    version,
    updatedAt: new Date().toISOString()
  }

  await setKv(
    MIGRATION_NOTICE_REDIS_KEY,
    JSON.stringify(next),
    365 * 24 * 60 * 60
  )
  return NextResponse.json(next)
}
