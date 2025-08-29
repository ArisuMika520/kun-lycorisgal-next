import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import type { TopicComment } from '~/types/api/topic-comment'
import { createMessage } from '~/app/api/utils/message'

// 获取评论列表的请求体验证
const getCommentsSchema = z.object({
  topicId: z.string().transform(Number),
  sortField: z.enum(['created', 'like_count']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('50')
})

// 创建评论的请求体验证
const createCommentSchema = z.object({
  topicId: z.number(),
  content: z.string().min(1, '评论内容不能为空').max(10000, '评论内容不能超过10000字符'),
  parentId: z.number().optional()
})

// 编辑评论的请求体验证
const updateCommentSchema = z.object({
  commentId: z.number(),
  content: z.string().min(1, '评论内容不能为空').max(10000, '评论内容不能超过10000字符')
})

// 删除评论的请求体验证
const deleteCommentSchema = z.object({
  commentId: z.number()
})

// 获取话题评论列表
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const topicId = searchParams.get('topicId')
    const sortField = searchParams.get('sortField') || 'created'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '50'
    
    if (!topicId) {
      return NextResponse.json({ message: '缺少话题ID' }, { status: 400 })
    }

    const validatedData = getCommentsSchema.parse({
      topicId,
      sortField,
      sortOrder,
      page,
      limit
    })

    // 获取用户ID（如果已登录）
    const payload = await verifyHeaderCookie(req)
    const userId = payload?.uid

    // 构建排序条件
    const orderBy = {
      [validatedData.sortField]: validatedData.sortOrder
    }

    // 获取所有评论（包括回复）
    const allComments = await prisma.topic_comment.findMany({
      where: {
        topic_id: validatedData.topicId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            created: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        like_by: userId ? {
          where: { user_id: userId },
          select: { id: true }
        } : false
      },
      orderBy: { created: 'asc' }
    })

    // 构建评论树结构
    const commentMap = new Map()
    const topLevelComments: any[] = []

    // 第一遍遍历：创建所有评论的映射
    allComments.forEach((comment: any) => {
      commentMap.set(comment.id, {
        ...comment,
        replies: []
      })
    })

    // 第二遍遍历：构建树结构
    allComments.forEach((comment: any) => {
      if (comment.parent_id === null) {
        topLevelComments.push(commentMap.get(comment.id))
      } else {
        const parent = commentMap.get(comment.parent_id)
        if (parent) {
          parent.replies.push(commentMap.get(comment.id))
        }
      }
    })

    // 应用排序
    const sortComments = (comments: any[]) => {
      return comments.sort((a, b) => {
        if (validatedData.sortField === 'created') {
          const aTime = new Date(a.created).getTime()
          const bTime = new Date(b.created).getTime()
          return validatedData.sortOrder === 'desc' ? bTime - aTime : aTime - bTime
        } else {
          return validatedData.sortOrder === 'desc' ? b.like_count - a.like_count : a.like_count - b.like_count
        }
      })
    }

    // 递归排序所有层级的回复
    const sortAllReplies = (comments: any[]) => {
      comments.forEach((comment: any) => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replies = sortComments(comment.replies)
          sortAllReplies(comment.replies)
        }
      })
    }

    const sortedTopComments = sortComments(topLevelComments)
    sortAllReplies(sortedTopComments)

    // 分页处理（只对顶级评论分页）
    const paginatedComments = sortedTopComments.slice(
      (validatedData.page - 1) * validatedData.limit,
      validatedData.page * validatedData.limit
    )

    const comments = paginatedComments

    // 获取顶级评论总数
    const total = topLevelComments.length

    // 递归转换数据格式
    const convertComment = (comment: any): TopicComment => ({
      id: comment.id,
      content: comment.content,
      like_count: comment.like_count,
      user: comment.user,
      topic_id: comment.topic_id,
      parent_id: comment.parent_id,
      parent: comment.parent ? {
        id: comment.parent.id,
        content: comment.parent.content,
        created: comment.parent.created.toISOString(),
        user: {
          id: comment.parent.user.id,
          name: comment.parent.user.name,
          avatar: comment.parent.user.avatar
        },
        like_count: 0,
        updated: comment.parent.created.toISOString()
      } : undefined,
      replies: comment.replies ? comment.replies.map(convertComment) : [],
      created: comment.created.toISOString(),
      updated: comment.updated.toISOString(),
      isLiked: comment.like_by && comment.like_by.length > 0
    })

    const result: TopicComment[] = comments.map(convertComment)

    return NextResponse.json({
      comments: result,
      pagination: {
        page: validatedData.page,
        limit: validatedData.limit,
        total,
        totalPages: Math.ceil(total / validatedData.limit)
      }
    }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 })
    }
    console.error('获取评论列表失败:', error)
    return NextResponse.json({ message: '获取评论列表失败' }, { status: 500 })
  }
}

// 创建话题评论
export const POST = async (req: NextRequest) => {
  try {
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ message: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = createCommentSchema.parse(body)

    // 检查话题是否存在
    const existingTopic = await prisma.topic.findUnique({
      where: { id: validatedData.topicId }
    })

    if (!existingTopic) {
      return NextResponse.json({ message: '话题不存在' }, { status: 404 })
    }

    // 如果有父评论ID，检查父评论是否存在
    if (validatedData.parentId) {
      const parentComment = await prisma.topic_comment.findUnique({
        where: { id: validatedData.parentId }
      })
      if (!parentComment) {
        return NextResponse.json({ message: '父评论不存在' }, { status: 404 })
      }
    }

    // 创建评论
    const newComment = await prisma.topic_comment.create({
      data: {
        content: validatedData.content,
        user_id: payload.uid,
        topic_id: validatedData.topicId,
        parent_id: validatedData.parentId || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            created: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    // 发送通知
    try {
      if (validatedData.parentId && newComment.parent) {
        // 如果是回复评论，通知被回复的评论作者
        if (newComment.parent.user.id !== payload.uid) {
          await createMessage({
             type: 'mention',
             content: `${newComment.user.name} 回复了你的评论`,
             sender_id: payload.uid,
             recipient_id: newComment.parent.user.id,
             link: `/topic/${validatedData.topicId}#comment-${newComment.id}`
           })
        }
      } else {
        // 如果是评论话题，通知话题作者
        if (existingTopic.user_id !== payload.uid) {
          await createMessage({
             type: 'mention',
             content: `${newComment.user.name} 评论了你的话题`,
             sender_id: payload.uid,
             recipient_id: existingTopic.user_id,
             link: `/topic/${validatedData.topicId}#comment-${newComment.id}`
           })
        }
      }
    } catch (notificationError) {
      console.error('发送通知失败:', notificationError)
      // 通知失败不影响评论创建
    }

    const result: TopicComment = {
      id: newComment.id,
      content: newComment.content,
      like_count: newComment.like_count,
      user: newComment.user,
      topic_id: newComment.topic_id,
      parent_id: newComment.parent_id,
      parent: newComment.parent ? {
        id: newComment.parent.id,
        content: newComment.parent.content,
        created: newComment.parent.created.toISOString(),
        user: {
          id: newComment.parent.user.id,
          name: newComment.parent.user.name,
          avatar: newComment.parent.user.avatar
        },
        like_count: 0,
        updated: newComment.parent.created.toISOString()
      } : undefined,
      replies: [],
      created: newComment.created.toISOString(),
      updated: newComment.updated.toISOString(),
      isLiked: false
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 })
    }
    console.error('创建评论失败:', error)
    return NextResponse.json({ message: '创建评论失败' }, { status: 500 })
  }
}

// 编辑话题评论
export const PUT = async (req: NextRequest) => {
  try {
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ message: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = updateCommentSchema.parse(body)

    // 检查评论是否存在且属于当前用户
    const existingComment = await prisma.topic_comment.findUnique({
      where: { id: validatedData.commentId },
      include: { user: true }
    })

    if (!existingComment) {
      return NextResponse.json({ message: '评论不存在' }, { status: 404 })
    }

    if (existingComment.user_id !== payload.uid) {
      return NextResponse.json({ message: '无权限编辑此评论' }, { status: 403 })
    }

    // 更新评论
    const updatedComment = await prisma.topic_comment.update({
      where: { id: validatedData.commentId },
      data: {
        content: validatedData.content
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            created: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    const result: TopicComment = {
      id: updatedComment.id,
      content: updatedComment.content,
      like_count: updatedComment.like_count,
      user: updatedComment.user,
      topic_id: updatedComment.topic_id,
      parent_id: updatedComment.parent_id,
      parent: updatedComment.parent ? {
        id: updatedComment.parent.id,
        content: updatedComment.parent.content,
        created: updatedComment.parent.created.toISOString(),
        user: {
          id: updatedComment.parent.user.id,
          name: updatedComment.parent.user.name,
          avatar: updatedComment.parent.user.avatar
        },
        like_count: 0,
        updated: updatedComment.parent.created.toISOString()
      } : undefined,
      replies: [],
      created: updatedComment.created.toISOString(),
      updated: updatedComment.updated.toISOString(),
      isLiked: false
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 })
    }
    console.error('编辑评论失败:', error)
    return NextResponse.json({ message: '编辑评论失败' }, { status: 500 })
  }
}

// 删除话题评论
export const DELETE = async (req: NextRequest) => {
  try {
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ message: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = deleteCommentSchema.parse(body)

    // 检查评论是否存在且属于当前用户
    const existingComment = await prisma.topic_comment.findUnique({
      where: { id: validatedData.commentId },
      include: { user: true }
    })

    if (!existingComment) {
      return NextResponse.json({ message: '评论不存在' }, { status: 404 })
    }

    if (existingComment.user_id !== payload.uid) {
      return NextResponse.json({ message: '无权限删除此评论' }, { status: 403 })
    }

    // 使用事务删除评论及其相关数据
    await prisma.$transaction(async (tx) => {
      // 删除评论的所有点赞记录
      await tx.topic_comment_like.deleteMany({
        where: { comment_id: validatedData.commentId }
      })

      // 删除评论本身
      await tx.topic_comment.delete({
        where: { id: validatedData.commentId }
      })

      // 删除所有子评论的点赞记录
      await tx.topic_comment_like.deleteMany({
        where: {
          comment: {
            parent_id: validatedData.commentId
          }
        }
      })

      // 删除所有子评论
      await tx.topic_comment.deleteMany({
        where: { parent_id: validatedData.commentId }
      })
    })

    return NextResponse.json({ message: '删除成功' }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0].message }, { status: 400 })
    }
    console.error('删除评论失败:', error)
    return NextResponse.json({ message: '删除评论失败' }, { status: 500 })
  }
}

// 点赞/取消点赞话题评论
export const PATCH = async (req: NextRequest) => {
  try {
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ message: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const { commentId } = body

    if (!commentId) {
      return NextResponse.json({ message: '缺少评论ID' }, { status: 400 })
    }

    // 检查评论是否存在
    const existingComment = await prisma.topic_comment.findUnique({
      where: { id: commentId }
    })

    if (!existingComment) {
      return NextResponse.json({ message: '评论不存在' }, { status: 404 })
    }

    // 使用事务处理点赞逻辑
    const result = await prisma.$transaction(async (tx) => {
      // 检查是否已经点赞
      const existingLike = await tx.topic_comment_like.findFirst({
        where: {
          user_id: payload.uid,
          comment_id: commentId
        }
      })

      if (existingLike) {
        // 取消点赞
        await tx.topic_comment.update({
          where: { id: commentId },
          data: { like_count: { decrement: 1 } }
        })

        await tx.topic_comment_like.delete({
          where: { id: existingLike.id }
        })

        return { isLiked: false, message: '取消点赞成功' }
      } else {
        // 点赞
        await tx.topic_comment.update({
          where: { id: commentId },
          data: { like_count: { increment: 1 } }
        })

        await tx.topic_comment_like.create({
          data: {
            user_id: payload.uid,
            comment_id: commentId
          }
        })

        return { isLiked: true, message: '点赞成功' }
      }
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('点赞操作失败:', error)
    return NextResponse.json({ message: '点赞操作失败' }, { status: 500 })
  }
}