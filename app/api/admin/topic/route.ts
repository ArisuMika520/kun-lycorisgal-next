import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { updateTopicSchema } from '~/validations/topic'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'

// 管理员更新话题（置顶/取消置顶）
export const PATCH = async (req: NextRequest) => {
  const payload = await verifyHeaderCookie(req)
  if (!payload || payload.role < 3) { // role 3 是管理员
    return NextResponse.json('权限不足', { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, is_pinned } = updateTopicSchema.parse(body)

    const topic = await prisma.topic.update({
      where: { id },
      data: {
        ...(is_pinned !== undefined && { is_pinned })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json(topic)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.errors[0].message, { status: 400 })
    }
    return NextResponse.json('更新失败', { status: 500 })
  }
}