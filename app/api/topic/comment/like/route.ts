import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { createMessage } from '~/app/api/utils/message'

// 评论点赞请求验证
const commentLikeSchema = z.object({
  commentId: z.number()
})

// 点赞/取消点赞评论
export const POST = async (req: NextRequest) => {
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json({ message: '用户未登录' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { commentId } = commentLikeSchema.parse(body)

    // 检查评论是否存在
    const comment = await prisma.topic_comment.findUnique({
      where: { id: commentId },
      include: {
        topic: {
          select: {
            status: true,
            id: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!comment || comment.topic.status !== 0) {
      return NextResponse.json({ message: '评论不存在' }, { status: 404 })
    }

    // 检查是否已经点赞
    const existingLike = await prisma.topic_comment_like.findUnique({
      where: {
        user_id_comment_id: {
          user_id: payload.uid,
          comment_id: commentId
        }
      }
    })

    if (existingLike) {
      // 取消点赞
      await prisma.$transaction([
        prisma.topic_comment_like.delete({
          where: { id: existingLike.id }
        }),
        prisma.topic_comment.update({
          where: { id: commentId },
          data: {
            like_count: {
              decrement: 1
            }
          }
        })
      ])
      
      return NextResponse.json({ 
        liked: false, 
        message: '取消点赞成功' 
      })
    } else {
      // 添加点赞
      await prisma.$transaction([
        prisma.topic_comment_like.create({
          data: {
            user_id: payload.uid,
            comment_id: commentId
          }
        }),
        prisma.topic_comment.update({
          where: { id: commentId },
          data: {
            like_count: {
              increment: 1
            }
          }
        })
      ])

      // 发送通知给评论作者（不给自己发通知）
      if (comment.user_id !== payload.uid) {
        try {
          // 获取当前用户信息
          const currentUser = await prisma.user.findUnique({
            where: { id: payload.uid },
            select: { name: true }
          })

          if (currentUser) {
            await createMessage({
              type: 'like',
              content: `${currentUser.name} 点赞了你的评论`,
              sender_id: payload.uid,
              recipient_id: comment.user_id,
              link: `/topic/${comment.topic.id}#comment-${commentId}`
            })
          }
        } catch (notificationError) {
          console.error('发送通知失败:', notificationError)
          // 通知失败不影响点赞操作
        }
      }
      
      return NextResponse.json({ 
        liked: true, 
        message: '点赞成功' 
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 })
    }
    console.error('评论点赞操作失败:', error)
    return NextResponse.json({ message: '操作失败' }, { status: 500 })
  }
}