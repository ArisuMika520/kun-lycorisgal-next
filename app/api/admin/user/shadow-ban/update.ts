import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { adminShadowBanUserSchema } from '~/validations/admin'
import { adminFail, type AdminFailure, guardManageUser } from '../_guard'

export type ShadowBanResult = { ok: true; enabled: boolean } | AdminFailure

/**
 * 开启或解除 shadow ban，权限规则与封禁相同（`guardManageUser`，管理员即可）。
 *
 * 刻意 **不吊销会话**、不发站内通知：被 shadow ban 的用户应当察觉不到变化，
 * 继续正常发布内容，但这些内容按 `app/api/utils/userVisibility.ts` 对其他人隐藏，
 * 用来应对违规用户反复注册新号发布违规内容。
 */
export const updateUserShadowBan = async (
  input: z.infer<typeof adminShadowBanUserSchema>,
  adminUid: number
): Promise<ShadowBanResult> => {
  const guard = await guardManageUser(adminUid, input.uid, 3)
  if (!guard.ok) {
    return guard
  }
  const { admin, user } = guard

  if (user.delete_time) {
    return adminFail(409, '该用户已被删除，请先恢复')
  }
  const isShadowBanned = user.shadow_ban_time !== null
  if (isShadowBanned === input.enabled) {
    return adminFail(
      409,
      input.enabled
        ? '该用户已处于 shadow ban 状态'
        : '该用户当前未被 shadow ban'
    )
  }

  const action = input.enabled ? 'shadow ban 了' : '解除了 shadow ban：'
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { shadow_ban_time: input.enabled ? new Date() : null }
    }),
    prisma.admin_log.create({
      data: {
        type: 'update',
        user_id: admin.id,
        content: `管理员 ${admin.name} ${action}用户 ${user.name} (ID: ${user.id})`
      }
    })
  ])

  return { ok: true, enabled: input.enabled }
}
