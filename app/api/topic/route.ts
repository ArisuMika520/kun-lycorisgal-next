import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '~/prisma/index'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { topicListSchema, createTopicSchema } from '~/validations/topic'
import { markdownToText } from '~/utils/markdownToText'
import type { TopicCard } from '~/types/api/topic'

// GET - 获取话题列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const validatedData = topicListSchema.parse({
    sortField: searchParams.get('sortField') || 'created',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    is_pinned: searchParams.get('is_pinned') === 'true' ? true : searchParams.get('is_pinned') === 'false' ? false : undefined
  })

  const { sortField, sortOrder, page, limit, is_pinned } = validatedData

  const where: Prisma.topicWhereInput = {
    status: 0 // 只显示未删除的话题
  }
  
  if (is_pinned !== undefined) {
    where.is_pinned = is_pinned
  }

  // 修改排序逻辑：置顶话题优先，然后按照指定字段排序
  const orderBy: Prisma.topicOrderByWithRelationInput[] = [
    { is_pinned: 'desc' }, // 置顶话题优先
    { [sortField]: sortOrder } // 然后按照指定字段排序
  ]

  const topics = await prisma.topic.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
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
          topic_likes: true,
          topic_comments: true
        }
      }
    }
  })

  const total = await prisma.topic.count({ where })

  const topicCards: TopicCard[] = topics.map((topic: any) => ({
    id: topic.id,
    title: topic.title,
    content: markdownToText(topic.content).slice(0, 200),
    is_pinned: topic.is_pinned,
    view_count: topic.view_count,
    like_count: topic._count.topic_likes,
    comment_count: topic._count.topic_comments,
    user: {
      id: topic.user.id,
      name: topic.user.name,
      avatar: topic.user.avatar
    },
    created: topic.created.toISOString(),
    updated: topic.updated.toISOString()
  }))

  return Response.json({
    topics: topicCards,
    total,
    page,
    limit
  })
}

// POST - 创建新话题
export async function POST(request: NextRequest) {
  const payload = await verifyHeaderCookie(request)
  if (!payload) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const validatedData = createTopicSchema.parse(body)
  const { title, content } = validatedData

  const topic = await prisma.topic.create({
    data: {
      title,
      content,
      user_id: payload.uid
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

  return Response.json({
    message: 'Topic created successfully',
    topic: {
      id: topic.id,
      title: topic.title,
      content: topic.content,
      is_pinned: topic.is_pinned,
      view_count: topic.view_count,
      like_count: topic.like_count,
      user: {
        id: topic.user.id,
        name: topic.user.name,
        avatar: topic.user.avatar
      },
      created: topic.created.toISOString(),
      updated: topic.updated.toISOString()
    }
  }, { status: 201 })
}