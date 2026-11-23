import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { renderMarkdownToHtml } from '~/app/api/utils/render/renderMarkdownToHtml'
import { visibleAuthorWhere } from '~/app/api/utils/userVisibility'
import type { PatchResource } from '~/types/api/patch'

const patchIdSchema = z.object({
  patchId: z.coerce.number().min(1).max(9999999)
})

export const getPatchResource = async (
  input: z.infer<typeof patchIdSchema>,
  uid: number
) => {
  const { patchId } = input

  const data = await prisma.patch_resource.findMany({
    // 伪删除 / shadow ban 用户的资源不对他人展示，本人可见
    where: { patch_id: patchId, user: visibleAuthorWhere(uid) },
    include: {
      patch: { select: { unique_id: true } },
      user: {
        include: {
          _count: {
            select: { patch_resource: true }
          }
        }
      },
      _count: {
        select: { like_by: true }
      },
      like_by: {
        where: {
          user_id: uid
        }
      }
    }
  })

  const resources: PatchResource[] = await Promise.all(
    data.map(async (resource) => ({
      id: resource.id,
      name: resource.name,
      section: resource.section,
      uniqueId: resource.patch.unique_id,
      storage: resource.storage,
      size: resource.size,
      type: resource.type,
      language: resource.language,
      note: resource.note,
      noteHtml: resource.note
        ? await renderMarkdownToHtml(resource.note)
        : undefined,
      hash: resource.hash,
      content: resource.content,
      code: resource.code,
      password: resource.password,
      platform: resource.platform,
      likeCount: resource.like_by.length,
      isLike: resource.like_by.length > 0,
      status: resource.status,
      userId: resource.user_id,
      patchId: resource.patch_id,
      created: String(resource.created),
      user: {
        id: resource.user.id,
        name: resource.user.name,
        avatar: resource.user.avatar,
        patchCount: resource.user._count.patch_resource
      }
    }))
  )

  return resources
}
