import { prisma } from '~/prisma/index'

export type AdminFailStatus = 400 | 403 | 404 | 409

export interface AdminFailure {
  ok: false
  httpStatus: AdminFailStatus
  error: string
}

export const adminFail = (
  httpStatus: AdminFailStatus,
  error: string
): AdminFailure => ({ ok: false, httpStatus, error })

const managedUserSelect = {
  id: true,
  name: true,
  email: true,
  ip: true,
  role: true,
  status: true,
  delete_time: true,
  shadow_ban_time: true
} as const

/**
 * 管理员对单个用户执行管理操作（编辑、封禁、shadow ban、删除、恢复）前的统一校验：
 * - 不能对自己操作；
 * - 操作者角色从数据库重读（JWT 里的角色只是签发时的快照），且不低于 `requiredRole`；
 * - 只能管理权限 **严格低于** 自己的用户：管理员管用户和创作者，超级管理员还能管管理员，
 *   同级之间（包括超级管理员之间）不能互相操作。
 */
export const guardManageUser = async (
  adminUid: number,
  targetUid: number,
  requiredRole: 3 | 4
) => {
  if (adminUid === targetUid) {
    return adminFail(400, '不能对自己执行该操作')
  }

  const [admin, user] = await Promise.all([
    prisma.user.findUnique({
      where: { id: adminUid },
      select: { id: true, name: true, role: true }
    }),
    prisma.user.findUnique({
      where: { id: targetUid },
      select: managedUserSelect
    })
  ])
  if (!admin || admin.role < requiredRole) {
    return adminFail(
      403,
      requiredRole >= 4 ? '本操作仅超级管理员可用' : '本操作仅管理员可用'
    )
  }
  if (!user) {
    return adminFail(404, '未找到该用户')
  }
  if (user.role >= admin.role) {
    return adminFail(403, '不能管理与您同级或权限更高的用户')
  }

  return { ok: true as const, admin, user }
}
