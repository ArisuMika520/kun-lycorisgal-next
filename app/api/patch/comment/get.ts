import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { nestComments } from './_helpers'
import { markdownToHtml } from '~/app/api/utils/render/markdownToHtml'
import { visibleAuthorWhere } from '~/app/api/utils/userVisibility'
import type { PatchComment } from '~/types/api/patch'

const patchIdSchema = z.object({
  patchId: z.coerce.number().min(1).max(9999999)
})

export const getPatchComment = async (
  input: z.infer<typeof patchIdSchema>,
  uid: number
) => {
  const { patchId } = input

  const data = await prisma.patch_comment.findMany({
    // 伪删除 / shadow ban 用户的评论不对他人展示，本人可见。
    // 被隐藏评论下的回复会因找不到父评论而被 nestComments 一并略去。
    where: { patch_id: patchId, user: visibleAuthorWhere(uid) },
    include: {
      user: true,
      patch: {
        select: {
          unique_id: true
        }
      },
      like_by: {
        where: {
          user_id: uid
        }
      },
      _count: {
        select: { like_by: true }
      }
    }
  })

  const flatComments: PatchComment[] = await Promise.all(
    data.map(async (comment) => ({
      id: comment.id,
      uniqueId: comment.patch.unique_id,
      content: await markdownToHtml(comment.content),
      isLike: comment.like_by.length > 0,
      likeCount: comment._count.like_by,
      parentId: comment.parent_id,
      userId: comment.user_id,
      patchId: comment.patch_id,
      created: String(comment.created),
      updated: String(comment.updated),
      reply: [],
      user: {
        id: comment.user.id,
        name: comment.user.name,
        avatar: comment.user.avatar
      }
    }))
  )

  const nestedComments = nestComments(flatComments)

  return nestedComments
}
