import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParsePostBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { createMessage } from '~/app/api/utils/message'
import { prisma } from '~/prisma'

// 举报话题评论的请求体验证
const createTopicCommentReportSchema = z.object({
  commentId: z.number(),
  topicId: z.number(),
  content: z.string().min(1, '举报原因不能为空').max(1000, '举报原因不能超过1000字符')
})

export const createReport = async (
  input: z.infer<typeof createTopicCommentReportSchema>,
  uid: number
) => {
  const comment = await prisma.topic_comment.findUnique({
    where: { id: input.commentId },
    include: {
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })
  
  if (!comment) {
    throw new Error('评论不存在')
  }
  
  const topic = await prisma.topic.findUnique({
    where: { id: input.topicId },
    select: {
      id: true,
      title: true
    }
  })
  
  if (!topic) {
    throw new Error('话题不存在')
  }
  
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      name: true
    }
  })

  const STATIC_CONTENT = `用户: ${user?.name} 举报了话题 "${topic.title}" 下的评论\n\n评论作者: ${comment.user.name}\n评论内容: ${comment.content.slice(0, 200)}\n\n举报原因: ${input.content}`

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
      link: `/topic/${input.topicId}#comment-${input.commentId}`
    })
  }

  return {}
}

export const POST = async (req: NextRequest) => {
  try {
    const input = await kunParsePostBody(req, createTopicCommentReportSchema)
    if (typeof input === 'string') {
      return NextResponse.json({ message: input }, { status: 400 })
    }
    
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ message: '用户未登录' }, { status: 401 })
    }

    const response = await createReport(input, payload.uid)
    return NextResponse.json({ message: '举报提交成功', data: response })
  } catch (error) {
    console.error('提交举报失败:', error)
    return NextResponse.json({ message: '提交举报失败' }, { status: 500 })
  }
}