import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParsePostBody } from '~/app/api/utils/parseQuery'
import { prisma } from '~/prisma/index'
import { adminHandleFeedbackSchema } from '~/validations/admin'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { sliceUntilDelimiterFromEnd } from '~/app/api/utils/sliceUntilDelimiterFromEnd'
import { createMessage } from '~/app/api/utils/message'

export const handleFeedback = async (
  input: z.infer<typeof adminHandleFeedbackSchema>,
  adminUid: number
) => {
  const message = await prisma.user_message.findUnique({
    where: { id: input.messageId }
  })
  if (message?.status) {
    return '该反馈已被处理'
  }

  const SLICED_CONTENT = sliceUntilDelimiterFromEnd(message?.content).slice(
    0,
    200
  )
  const handleResult = input.content ? input.content : '无处理留言'
  const feedbackContent = `您的反馈已处理!\n\n反馈原因: ${SLICED_CONTENT}\n反馈处理回复: ${handleResult}`

  return prisma.$transaction(async (prisma) => {
    await prisma.user_message.update({
      where: { id: input.messageId },
      // status: 0 - unread, 1 - read, 2 - approve, 3 - decline
      data: { status: { set: 1 } }
    })

    await createMessage({
      type: 'feedback',
      content: feedbackContent,
      sender_id: adminUid,
      recipient_id: message?.sender_id ?? undefined,
      link: '/'
    })

    return {}
  })
}

export const POST = async (req: NextRequest) => {
  try {
    const input = await kunParsePostBody(req, adminHandleFeedbackSchema)
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

    const response = await handleFeedback(input, payload.uid)
    if (typeof response === 'string') {
      return NextResponse.json({ error: response }, { status: 500 })
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/admin/feedback/handle:', error)
    return NextResponse.json({ error: '处理反馈时发生错误' }, { status: 500 })
  }
}
