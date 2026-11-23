import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { adminUserIdSchema } from '~/validations/admin'
import { adminFail, type AdminFailure, guardManageUser } from '../_guard'
import { releaseUserRegistrationBan } from '../_registerBan'

/**
 * 恢复被伪删除的用户：清空 `delete_time` 并解除注册限制。仅超级管理员。
 * 删除前的封禁状态（status）和 shadow ban 状态会原样保留。
 */
export const restoreUser = async (
  input: z.infer<typeof adminUserIdSchema>,
  adminUid: number
): Promise<{ ok: true } | AdminFailure> => {
  const guard = await guardManageUser(adminUid, input.uid, 4)
  if (!guard.ok) {
    return guard
  }
  const { admin, user } = guard
  if (!user.delete_time) {
    return adminFail(409, '该用户未被删除')
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { delete_time: null }
    }),
    prisma.admin_log.create({
      data: {
        type: 'update',
        user_id: admin.id,
        content: `管理员 ${admin.name} 恢复了已删除的用户 ${user.name} (ID: ${user.id})`
      }
    })
  ])

  await releaseUserRegistrationBan(user)

  return { ok: true }
}
