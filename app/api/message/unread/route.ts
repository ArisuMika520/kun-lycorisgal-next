import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '~/prisma/index'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { VISIBLE_MESSAGE_SENDER_WHERE } from '~/app/api/utils/userVisibility'

export const getMessage = async (uid: number) => {
  const unread = await prisma.user_message.findFirst({
    // 与消息列表保持一致，隐藏用户发来的消息不触发未读提示
    where: { recipient_id: uid, status: 0, ...VISIBLE_MESSAGE_SENDER_WHERE }
  })
  return unread
}

export const GET = async (req: NextRequest) => {
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json({ message: '用户未登录' }, { status: 401 })
  }

  const response = await getMessage(payload.uid)
  return NextResponse.json(response)
}
