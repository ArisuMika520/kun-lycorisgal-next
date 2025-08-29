import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { topicLikeSchema } from '~/validations/topic'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { createMessage } from '~/app/api/utils/message'

export const POST = async (req: NextRequest) => {
  try {
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ error: '用户登录失效' }, { status: 401 })
    }

    const body = await req.json()
    const { topicId } = topicLikeSchema.parse(body)

    // 检查话题是否存在
    const topic = await prisma.topic.findUnique({
      where: { id: topicId, status: 0 },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!topic) {
      return NextResponse.json({ error: '话题不存在' }, { status: 404 })
    }

    // 检查是否已经点赞
    const existingLike = await prisma.topic_like.findUnique({
      where: {
        user_id_topic_id: {
          user_id: payload.uid,
          topic_id: topicId
        }
      }
    })

    if (existingLike) {
      // 取消点赞
      await prisma.topic_like.delete({
        where: { id: existingLike.id }
      })
      return NextResponse.json({ liked: false, message: '取消点赞成功' })
    } else {
      // 添加点赞
      await prisma.topic_like.create({
        data: {
          user_id: payload.uid,
          topic_id: topicId
        }
      })

      // 发送通知给话题作者（不给自己发通知）
      if (topic.user_id !== payload.uid) {
        try {
          // 获取当前用户信息
          const currentUser = await prisma.user.findUnique({
            where: { id: payload.uid },
            select: { name: true }
          })

          if (currentUser) {
            await createMessage({
              type: 'like',
              content: `${currentUser.name} 点赞了你的话题`,
              sender_id: payload.uid,
              recipient_id: topic.user_id,
              link: `/topic/${topicId}`
            })
          }
        } catch (notificationError) {
          console.error('发送通知失败:', notificationError)
          // 通知失败不影响点赞操作
        }
      }

      return NextResponse.json({ liked: true, message: '点赞成功' })
    }
  } catch (error) {
    console.error('Error in POST /api/topic/like:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}