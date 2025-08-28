import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { prisma } from '~/prisma/index'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import type { OverviewData } from '~/types/api/admin'

const daysSchema = z.object({
  days: z.coerce
    .number({ message: '天数必须为数字' })
    .min(1)
    .max(60, { message: '最多展示 60 天的数据' })
})

export const getOverviewData = async (days: number): Promise<OverviewData> => {
  const time = new Date()
  time.setDate(time.getDate() - days)

  const [newUser, newActiveUser, newGalgame, newGalgameResource, newComment, newTopic, totalTopics, pinnedTopics] =
    await Promise.all([
      prisma.user.count({
        where: {
          created: {
            gte: time
          }
        }
      }),
      prisma.user.count({
        where: {
          last_login_time: {
            gte: time.getTime().toString()
          }
        }
      }),
      prisma.patch.count({
        where: {
          created: {
            gte: time
          }
        }
      }),
      prisma.patch_resource.count({
        where: {
          created: {
            gte: time
          }
        }
      }),
      prisma.patch_comment.count({
        where: {
          created: {
            gte: time
          }
        }
      }),
      prisma.topic.count({
        where: {
          created: {
            gte: time
          }
        }
      }),
      prisma.topic.count(),
      prisma.topic.count({
        where: {
          is_pinned: true
        }
      })
    ])

  return { newUser, newActiveUser, newGalgame, newGalgameResource, newComment, newTopic, totalTopics, pinnedTopics }
}

export const GET = async (req: NextRequest) => {
  try {
    const input = kunParseGetQuery(req, daysSchema)
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

    const data = await getOverviewData(input.days)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/admin/stats:', error)
    return NextResponse.json({ error: '获取统计数据时发生错误' }, { status: 500 })
  }
}
