import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '~/prisma/index'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'

// 管理员获取话题列表
export const GET = async (req: NextRequest) => {
  try {
    const payload = await verifyHeaderCookie(req)
    if (!payload || payload.role < 3) { // role 3 是管理员
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where: {
          status: 0 // 只显示未删除的话题
        },
        skip,
        take: limit,
        orderBy: [
          { is_pinned: 'desc' },
          { created: 'desc' }
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      }),
      prisma.topic.count({
        where: {
          status: 0 // 只统计未删除的话题
        }
      })
    ])

    return NextResponse.json({
      topics,
      total,
      page,
      limit
    })
  } catch (error) {
    console.error('获取话题列表失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}