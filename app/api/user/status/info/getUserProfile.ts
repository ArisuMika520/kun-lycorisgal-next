import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { canViewUserContent } from '~/app/api/utils/userVisibility'
import type { UserInfo } from '~/types/api/user'

export const getProfileSchema = z.object({
  id: z.coerce.number().min(1).max(9999999)
})

interface Viewer {
  uid: number
  role: number
}

/**
 * 个人主页资料。viewer 为当前访问者（未登录为 `{ uid: 0, role: 0 }`）。
 *
 * - 已伪删除的用户只有管理员能打开，其他人得到“未找到用户”；
 * - 内容被隐藏时（伪删除 / shadow ban，且访问者不是本人或管理员），内容计数返回 0，
 *   对外看起来像一个没有发布过内容的账号；
 * - `isDeleted` / `isShadowBanned` 只对管理员如实返回，其他人（包括本人）恒为 false，
 *   避免 shadow ban 状态随页面数据泄露给被 shadow ban 的用户。
 */
export const getUserProfile = async (
  input: z.infer<typeof getProfileSchema>,
  viewer: Viewer
) => {
  const data = await prisma.user.findUnique({
    where: { id: input.id },
    include: {
      _count: {
        select: {
          patch_resource: true,
          patch: true,
          patch_comment: true,
          send_message: true
        }
      },
      follower: true,
      following: true
    }
  })
  const isViewerAdmin = viewer.role >= 3
  if (!data || (data.delete_time && !isViewerAdmin)) {
    return '未找到用户'
  }

  const canViewContent = canViewUserContent(data, viewer)
  const userFavoritePatchCount = canViewContent
    ? await prisma.user_patch_favorite_folder_relation.count({
        where: { folder: { user_id: input.id } }
      })
    : 0

  const followerUserUid = data.following.map((f) => f.follower_id)

  const user: UserInfo = {
    id: data.id,
    requestUserUid: viewer.uid,
    name: data.name,
    email: data.email,
    avatar: data.avatar,
    bio: data.bio,
    role: data.role,
    status: data.status,
    registerTime: String(data.register_time),
    moemoepoint: data.moemoepoint,
    follower: data.following.length,
    following: data.follower.length,
    isFollow: followerUserUid.includes(viewer.uid),
    isDeleted: isViewerAdmin && data.delete_time !== null,
    isShadowBanned: isViewerAdmin && data.shadow_ban_time !== null,
    _count: canViewContent
      ? { ...data._count, patch_favorite: userFavoritePatchCount }
      : {
          patch: 0,
          patch_resource: 0,
          patch_comment: 0,
          patch_favorite: 0,
          send_message: 0
        }
  }

  return user
}
