import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '~/prisma/index'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { updateTopicSchema } from '~/validations/topic'
import type { Topic } from '~/types/api/topic'

// 获取话题详情
export const getTopic = async (id: number, userId?: number) => {
  const topic = await prisma.topic.findUnique({
    where: { id, status: 0 },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      },
      _count: {
        select: {
          topic_likes: true
        }
      },
      ...(userId && {
        topic_likes: {
          where: { user_id: userId },
          select: { id: true }
        }
      })
    }
  })

  if (!topic) {
    return null
  }

  // 增加浏览量
  await prisma.topic.update({
    where: { id },
    data: { view_count: { increment: 1 } }
  })

  const result: Topic = {
    id: topic.id,
    title: topic.title,
    content: topic.content,
    status: topic.status,
    is_pinned: topic.is_pinned,
    view_count: topic.view_count + 1,
    like_count: topic._count.topic_likes,
    user: topic.user,
    created: topic.created,
    updated: topic.updated,
    isLiked: userId ? topic.topic_likes.length > 0 : false
  }

  return result
}

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的话题ID' }, { status: 400 })
    }

    const payload = await verifyHeaderCookie(req)
    const userId = payload?.uid

    const topic = await getTopic(id, userId)
    if (!topic) {
      return NextResponse.json({ error: '话题不存在' }, { status: 404 })
    }

    return NextResponse.json(topic)
  } catch (error) {
    console.error('Error in GET /api/topic/[id]:', error)
    return NextResponse.json({ error: '获取话题详情时发生错误' }, { status: 500 })
  }
}

// PUT - 编辑话题
export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的话题ID' }, { status: 400 })
    }

    // 验证用户登录状态
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取请求体数据
    const body = await req.json()
    const validatedData = updateTopicSchema.parse({ ...body, id })

    // 检查话题是否存在
    const existingTopic = await prisma.topic.findUnique({
      where: { id, status: 0 },
      select: {
        id: true,
        user_id: true,
        title: true,
        content: true
      }
    })

    if (!existingTopic) {
      return NextResponse.json({ error: '话题不存在' }, { status: 404 })
    }

    // 检查权限：只有话题作者可以编辑
    if (existingTopic.user_id !== payload.uid) {
      return NextResponse.json({ error: '无权限编辑此话题' }, { status: 403 })
    }

    // 构建更新数据
    const updateData: any = {
      updated: new Date()
    }

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title
    }

    if (validatedData.content !== undefined) {
      updateData.content = validatedData.content
    }

    // 更新话题
    const updatedTopic = await prisma.topic.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            topic_likes: true
          }
        },
        topic_likes: {
          where: { user_id: payload.uid },
          select: { id: true }
        }
      }
    })

    // 构建返回数据
    const result: Topic = {
      id: updatedTopic.id,
      title: updatedTopic.title,
      content: updatedTopic.content,
      status: updatedTopic.status,
      is_pinned: updatedTopic.is_pinned,
      view_count: updatedTopic.view_count,
      like_count: updatedTopic._count.topic_likes,
      user: updatedTopic.user,
      created: updatedTopic.created,
      updated: updatedTopic.updated,
      isLiked: updatedTopic.topic_likes.length > 0
    }

    return NextResponse.json({
      message: '话题更新成功',
      topic: result
    })
  } catch (error) {
    console.error('Error in PUT /api/topic/[id]:', error)
    return NextResponse.json({ error: '更新话题时发生错误' }, { status: 500 })
  }
}

// 删除话题（管理员功能）
export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的话题ID' }, { status: 400 })
    }

    // 验证用户登录状态
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 检查用户是否为管理员
    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: { role: true }
    })

    if (!user || user.role < 2) {
      return NextResponse.json({ error: '权限不足，只有管理员可以删除话题' }, { status: 403 })
    }

    // 检查话题是否存在
    const existingTopic = await prisma.topic.findUnique({
      where: { id, status: 0 },
      select: {
        id: true,
        title: true
      }
    })

    if (!existingTopic) {
      return NextResponse.json({ error: '话题不存在或已被删除' }, { status: 404 })
    }

    // 软删除话题（将status设为1）
    await prisma.topic.update({
      where: { id },
      data: {
        status: 1,
        updated: new Date()
      }
    })

    return NextResponse.json({
      message: '话题删除成功'
    })
  } catch (error) {
    console.error('Error in DELETE /api/topic/[id]:', error)
    return NextResponse.json({ error: '删除话题时发生错误' }, { status: 500 })
  }
}