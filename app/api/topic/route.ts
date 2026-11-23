import { NextRequest } from 'next/server'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { topicListSchema, createTopicSchema } from '~/validations/topic'
import { prisma } from '~/prisma/index'
import { getTopicList } from './getTopicList'

// GET - 获取话题列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const validatedData = topicListSchema.parse({
    sortField: searchParams.get('sortField') || 'created',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
    is_pinned:
      searchParams.get('is_pinned') === 'true'
        ? true
        : searchParams.get('is_pinned') === 'false'
          ? false
          : undefined
  })

  const { sortField, sortOrder, page, limit, is_pinned } = validatedData
  const payload = await verifyHeaderCookie(request)
  const response = await getTopicList(
    {
      sortField,
      sortOrder,
      page,
      limit,
      is_pinned
    },
    payload?.uid ?? 0
  )

  return Response.json(response)
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

  return Response.json(
    {
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
    },
    { status: 201 }
  )
}
