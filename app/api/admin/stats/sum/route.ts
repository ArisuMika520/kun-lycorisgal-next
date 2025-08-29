import { NextRequest, NextResponse } from 'next/server'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { prisma } from '~/prisma/index'
import type { SumData } from '~/types/api/admin'

export const getSumData = async (): Promise<SumData> => {
  const [
    userCount,
    galgameCount,
    galgameResourceCount,
    galgamePatchResourceCount,
    galgameCommentCount,
    topicCount,
    pinnedTopicCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.patch.count(),
    prisma.patch_resource.count({
      where: { section: 'galgame' }
    }),
    prisma.patch_resource.count({
      where: { section: 'patch' }
    }),
    prisma.patch_comment.count(),
    prisma.topic.count(),
    prisma.topic.count({
      where: { is_pinned: true }
    })
  ])

  return {
    userCount,
    galgameCount,
    galgameResourceCount,
    galgamePatchResourceCount,
    galgameCommentCount,
    topicCount,
    pinnedTopicCount
  }
}

export const GET = async (req: NextRequest) => {
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }
  if (payload.role < 3) {
    return NextResponse.json('本页面仅管理员可访问')
  }

  const data = await getSumData()
  return NextResponse.json(data)
}
