import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '~/prisma/index'
import { HomeResource } from '~/types/api/home'
import { GalgameCardSelectField } from '~/constants/api/select'
import { getNSFWHeader } from '~/app/api/utils/getNSFWHeader'
import { TopicCard } from '~/types/api/topic'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { visibleAuthorWhere } from '~/app/api/utils/userVisibility'

/**
 * 首页数据。viewerUid 用于内容可见性：伪删除 / shadow ban 用户的资源和话题
 * 不对他人展示，shadow ban 用户本人仍能看到自己的内容。
 */
export const getHomeData = async (
  nsfwEnable: Record<string, string | undefined>,
  viewerUid = 0
) => {
  const authorWhere = visibleAuthorWhere(viewerUid)
  const [data, resourcesData, topicsData] = await Promise.all([
    prisma.patch.findMany({
      orderBy: { created: 'desc' },
      where: nsfwEnable,
      select: GalgameCardSelectField,
      take: 24
    }),
    prisma.patch_resource.findMany({
      orderBy: { created: 'desc' },
      where: { patch: nsfwEnable, section: 'patch', user: authorWhere },
      include: {
        patch: {
          select: {
            name: true,
            unique_id: true
          }
        },
        user: {
          include: {
            _count: {
              select: { patch_resource: true }
            }
          }
        },
        _count: {
          select: {
            like_by: true
          }
        }
      },
      take: 6
    }),
    prisma.topic.findMany({
      where: {
        status: 0, // 只显示未删除的话题
        user: authorWhere
      },
      orderBy: [{ is_pinned: 'desc' }, { created: 'desc' }],
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
            topic_comments: { where: { user: authorWhere } }
          }
        }
      },
      take: 4
    })
  ])

  const galgames: GalgameCard[] = data.map((gal) => ({
    ...gal,
    tags: gal.tag.map((t) => t.tag.name).slice(0, 3),
    uniqueId: gal.unique_id
  }))

  const resources: HomeResource[] = resourcesData
    .filter((resource) => resource.patch !== null && resource.user !== null)
    .map((resource) => ({
      id: resource.id,
      name: resource.name,
      section: resource.section,
      uniqueId: resource.patch.unique_id,
      storage: resource.storage,
      size: resource.size,
      type: resource.type,
      language: resource.language,
      note: resource.note.slice(0, 233),
      platform: resource.platform,
      likeCount: resource._count.like_by,
      download: resource.download,
      patchId: resource.patch_id,
      patchName: resource.patch.name,
      created: String(resource.created),
      user: {
        id: resource.user.id,
        name: resource.user.name,
        avatar: resource.user.avatar,
        patchCount: resource.user._count.patch_resource
      }
    }))

  const topics: TopicCard[] = topicsData
    .filter((topic) => topic.user !== null)
    .map((topic) => ({
      id: topic.id,
      title: topic.title,
      content: topic.content.slice(0, 150),
      status: topic.status,
      is_pinned: topic.is_pinned,
      view_count: topic.view_count,
      like_count: topic._count.topic_likes,
      comment_count: topic._count.topic_comments,
      created: topic.created.toISOString(),
      updated: topic.updated.toISOString(),
      user: {
        id: topic.user.id,
        name: topic.user.name,
        avatar: topic.user.avatar
      }
    }))

  return { galgames, resources, topics }
}

export const GET = async (req: NextRequest) => {
  const nsfwEnable = getNSFWHeader(req)
  const payload = await verifyHeaderCookie(req)

  const response = await getHomeData(nsfwEnable, payload?.uid ?? 0)
  return NextResponse.json(response)
}
