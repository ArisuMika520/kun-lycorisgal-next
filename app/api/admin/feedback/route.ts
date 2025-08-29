import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { prisma } from '~/prisma/index'
import { adminPaginationSchema } from '~/validations/admin'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import type { Message } from '~/types/api/message'

export const getFeedback = async (
  input: z.infer<typeof adminPaginationSchema>
) => {
  const { page, limit } = input
  const offset = (page - 1) * limit

  const [data, total] = await Promise.all([
    prisma.user_message.findMany({
      where: { 
        type: 'feedback', 
        sender_id: { not: null },
        recipient_id: null // 只显示用户提交的原始反馈，不显示管理员发送给用户的处理结果
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { created: 'desc' },
      skip: offset,
      take: limit
    }),
    prisma.user_message.count({
      where: { 
        type: 'feedback', 
        sender_id: { not: null },
        recipient_id: null // 只计算用户提交的原始反馈数量
      }
    })
  ])

  const feedbacks: Message[] = data.map((msg) => ({
    id: msg.id,
    type: msg.type,
    content: msg.content,
    status: msg.status,
    link: msg.link,
    created: msg.created,
    sender: msg.sender
  }))

  return { feedbacks, total }
}

export const GET = async (req: NextRequest) => {
  try {
    const input = kunParseGetQuery(req, adminPaginationSchema)
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

    const response = await getFeedback(input)
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/admin/feedback:', error)
    return NextResponse.json({ error: '获取反馈数据失败' }, { status: 500 })
  }
}
