import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParsePostBody } from '~/app/api/utils/parseQuery'
import { prisma } from '~/prisma/index'
import { adminHandleReportSchema } from '~/validations/admin'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { sliceUntilDelimiterFromEnd } from '~/app/api/utils/sliceUntilDelimiterFromEnd'
import { createMessage } from '~/app/api/utils/message'

export const handleReport = async (
  input: z.infer<typeof adminHandleReportSchema>,
  adminUid: number
) => {
  const message = await prisma.user_message.findUnique({
    where: { id: input.messageId }
  })
  if (message?.status) {
    return '该举报已被处理'
  }

  const SLICED_CONTENT = sliceUntilDelimiterFromEnd(message?.content).slice(
    0,
    200
  )
  const handleResult = input.content ? input.content : '无处理留言'
  const reportContent = `您的举报已处理!\n\n举报原因: ${SLICED_CONTENT}\n举报处理回复: ${handleResult}`

  return prisma.$transaction(async (prisma) => {
    await prisma.user_message.update({
      where: { id: input.messageId },
      // status: 0 - unread, 1 - read, 2 - approve, 3 - decline
      data: { status: { set: 1 } }
    })

    await createMessage({
      type: 'report',
      content: reportContent,
      sender_id: adminUid,
      recipient_id: message?.sender_id ?? undefined,
      link: '/'
    })

    return {}
  })
}

export const POST = async (req: NextRequest) => {
  try {
    const input = await kunParsePostBody(req, adminHandleReportSchema)
    if (typeof input === 'string') {
      return NextResponse.json({ error: input }, { status: 400 })
    }
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 })
    }
    if (payload.role < 3) {
      return NextResponse.json({ error: '本页面仅管理员可访问' }, { status: 403 })
    }

    const response = await handleReport(input, payload.uid)
    if (typeof response === 'string') {
      return NextResponse.json({ error: response }, { status: 500 })
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/admin/report/handle:', error)
    return NextResponse.json({ error: '处理举报时发生错误' }, { status: 500 })
  }
}
