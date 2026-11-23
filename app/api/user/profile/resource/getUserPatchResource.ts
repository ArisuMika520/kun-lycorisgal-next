import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { getUserInfoSchema } from '~/validations/user'
import { canViewUserContentById } from '~/app/api/utils/userVisibility'
import type { UserResource } from '~/types/api/user'

/** 个人主页资源标签。被隐藏用户（伪删除 / shadow ban）对非本人、非管理员返回空列表 */
export const getUserPatchResource = async (
  input: z.infer<typeof getUserInfoSchema>,
  nsfwEnable: Record<string, string | undefined>,
  viewer: { uid: number; role: number }
) => {
  const { uid, page, limit } = input
  const offset = (page - 1) * limit

  if (!(await canViewUserContentById(uid, viewer))) {
    return { resources: [], total: 0 }
  }

  const [data, total] = await Promise.all([
    prisma.patch_resource.findMany({
      where: { user_id: uid, patch: nsfwEnable },
      include: {
        patch: true
      },
      orderBy: { created: 'desc' },
      skip: offset,
      take: limit
    }),
    prisma.patch_resource.count({
      where: { user_id: uid, patch: nsfwEnable }
    })
  ])

  const resources: UserResource[] = data.map((res) => ({
    id: res.id,
    patchUniqueId: res.patch.unique_id,
    patchId: res.patch.id,
    patchName: res.patch.name,
    patchBanner: res.patch.banner,
    size: res.size,
    type: res.type,
    language: res.language,
    platform: res.platform,
    created: String(res.created)
  }))

  return { resources, total }
}
