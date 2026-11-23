import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '../utils/parseQuery'
import { prisma } from '~/prisma/index'
import { commentSchema } from '~/validations/comment'
import { markdownToText } from '~/utils/markdownToText'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { visibleAuthorWhere } from '~/app/api/utils/userVisibility'
import type { PatchComment } from '~/types/api/comment'

/** 全站最新评论。viewerUid 用于过滤伪删除 / shadow ban 用户的评论（本人可见自己的） */
export const getComment = async (
  input: z.infer<typeof commentSchema>,
  viewerUid: number
) => {
  const { sortField, sortOrder, page, limit } = input
  const where = { user: visibleAuthorWhere(viewerUid) }

  const offset = (page - 1) * limit

  const orderByField =
    sortField === 'like'
      ? { like_by: { _count: sortOrder } }
      : { [sortField]: sortOrder }

  const [commentsData, total] = await Promise.all([
    prisma.patch_comment.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: orderByField,
      include: {
        patch: {
          select: {
            name: true,
            unique_id: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            like_by: true
          }
        }
      }
    }),
    prisma.patch_comment.count({ where })
  ])

  const comments: PatchComment[] = commentsData.map((comment) => ({
    id: comment.id,
    uniqueId: comment.patch.unique_id,
    user: comment.user,
    content: markdownToText(comment.content).slice(0, 233),
    patchName: comment.patch.name,
    patchId: comment.patch_id,
    like: comment._count.like_by,
    created: comment.created
  }))

  return { comments, total }
}

export const GET = async (req: NextRequest) => {
  const input = kunParseGetQuery(req, commentSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户登陆失效')
  }

  const response = await getComment(input, payload.uid)
  return NextResponse.json(response)
}
