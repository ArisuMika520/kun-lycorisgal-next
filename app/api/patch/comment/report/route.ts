import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParsePostBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { createPatchCommentReportSchema } from '~/validations/patch'
import { createMessage } from '~/app/api/utils/message'
import { prisma } from '~/prisma'

export const createReport = async (
  input: z.infer<typeof createPatchCommentReportSchema>,
  uid: number
) => {
  const comment = await prisma.patch_comment.findUnique({
    where: { id: input.commentId }
  })
  const patch = await prisma.patch.findUnique({
    where: { id: input.patchId }
  })
  const user = await prisma.user.findUnique({
    where: { id: uid }
  })

  const STATIC_CONTENT = `用户: ${user?.name} 举报了游戏 ${patch?.name} 下的评论\n\n评论内容: ${comment?.content.slice(0, 200)}\n\n举报原因: ${input.content}`

  // 获取所有管理员用户 (role >= 3)
  const admins = await prisma.user.findMany({
    where: {
      role: {
        gte: 3
      }
    },
    select: {
      id: true
    }
  })

  // 发送举报消息给所有管理员
  for (const admin of admins) {
    await createMessage({
      type: 'report',
      content: STATIC_CONTENT,
      sender_id: uid,
      recipient_id: admin.id,
      link: patch?.unique_id ? `/${patch.unique_id}` : ''
    })
  }

  return {}
}

export const POST = async (req: NextRequest) => {
  try {
    const input = await kunParsePostBody(req, createPatchCommentReportSchema)
    if (typeof input === 'string') {
      return NextResponse.json({ error: input }, { status: 400 })
    }
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 })
    }

    const response = await createReport(input, payload.uid)
    if (typeof response === 'string') {
      return NextResponse.json({ error: response }, { status: 500 })
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/patch/comment/report:', error)
    return NextResponse.json({ error: '提交举报时发生错误' }, { status: 500 })
  }
}
