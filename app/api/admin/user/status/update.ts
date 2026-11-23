import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { adminUpdateUserStatusSchema } from '~/validations/admin'
import { deleteKunToken } from '~/app/api/utils/jwt'
import { USER_STATUS_MAP } from '~/constants/user'
import { adminFail, type AdminFailure, guardManageUser } from '../_guard'

export type UpdateUserStatusResult = { ok: true; status: number } | AdminFailure

/**
 * 封禁或解封单个用户，只修改 `user.status`，不触碰其他字段。
 *
 * 与 `PUT /api/admin/user` 的整表单更新不同，这里专门服务用户主页的快捷操作。
 * 权限规则见 `guardManageUser`；状态未变化时直接拒绝，避免重复点击写出多余的审计日志。
 */
export const updateUserStatus = async (
  input: z.infer<typeof adminUpdateUserStatusSchema>,
  adminUid: number
): Promise<UpdateUserStatusResult> => {
  const guard = await guardManageUser(adminUid, input.uid, 3)
  if (!guard.ok) {
    return guard
  }
  const { admin, user } = guard

  if (user.delete_time) {
    return adminFail(409, '该用户已被删除，请先恢复')
  }
  if (user.status === input.status) {
    return adminFail(
      409,
      input.status === 2 ? '该用户已处于封禁状态' : '该用户当前未被封禁'
    )
  }

  const action = input.status === 2 ? '封禁' : '解除封禁'
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { status: input.status }
    }),
    prisma.admin_log.create({
      data: {
        type: 'update',
        user_id: admin.id,
        content: `管理员 ${admin.name} ${action}了用户 ${user.name} (ID: ${user.id})\n\n状态: ${USER_STATUS_MAP[user.status]} → ${USER_STATUS_MAP[input.status]}`
      }
    })
  ])

  // 状态写入后再吊销会话：登录接口会拒绝 status === 2，
  // 但已签发的 JWT 不检查 status，必须删除白名单才能让封禁立即生效。
  await deleteKunToken(user.id)

  return { ok: true, status: input.status }
}
