import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { deleteKunToken } from '~/app/api/utils/jwt'
import { adminUserIdSchema } from '~/validations/admin'
import { guardManageUser } from './_guard'
import { banUserRegistration } from './_registerBan'

/**
 * 伪删除用户（旧式错误返回：失败时返回字符串）。仅超级管理员，且不能删除同级用户。
 *
 * 只写入 `delete_time`，不删除任何数据，也不删除对象存储中的资源文件：
 * - 账号无法登录（登录、OAuth、找回密码都会拦截），现有会话立即吊销；
 * - 其资源、评论、话题、站内消息按 `app/api/utils/userVisibility.ts` 对所有人隐藏；
 * - 邮箱和注册 IP 被永久禁止注册；
 * - 可通过 `PUT /api/admin/user/restore` 恢复。
 */
export const deleteUser = async (
  input: z.infer<typeof adminUserIdSchema>,
  adminUid: number
) => {
  const guard = await guardManageUser(adminUid, input.uid, 4)
  if (!guard.ok) {
    return guard.error
  }
  const { admin, user } = guard
  if (user.delete_time) {
    return '该用户已被删除'
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { delete_time: new Date() }
    }),
    prisma.admin_log.create({
      data: {
        type: 'delete',
        user_id: admin.id,
        content: `管理员 ${admin.name} 删除了用户 ${user.name} (ID: ${user.id})，数据已保留，可恢复\n\n${JSON.stringify(user)}`
      }
    })
  ])

  await banUserRegistration(user)
  // 删除后立即吊销会话白名单，否则旧 JWT 在 30 天内仍能通过 verifyKunToken。
  await deleteKunToken(user.id)

  return {}
}
