import { prisma } from '~/prisma/index'
import { delKv, setKv } from '~/lib/redis'
import { KUN_PATCH_PERMANENT_BAN_USER_KEY } from '~/config/redis'

interface BanTarget {
  id: number
  email: string
  ip: string
}

const emailKey = (email: string) =>
  `${KUN_PATCH_PERMANENT_BAN_USER_KEY}:${email}`
const ipKey = (ip: string) => `${KUN_PATCH_PERMANENT_BAN_USER_KEY}:${ip}`

/**
 * 伪删除用户时，永久禁止其邮箱和注册 IP 再次注册（邮箱注册与 OAuth 建号都会检查）。
 * 注册 IP 为空的老账号不写 IP 键，避免生成一个无意义的 `admin:delete:user:` 键。
 */
export const banUserRegistration = async (user: BanTarget) => {
  await setKv(emailKey(user.email), user.email)
  if (user.ip) {
    await setKv(ipKey(user.ip), user.ip)
  }
}

/**
 * 恢复用户时解除注册限制。
 * 同一 IP 可能还属于其他仍处于删除状态的用户，此时保留 IP 键，只解除邮箱。
 * 历史上被物理删除的用户已不在库中，无法判断其 IP，恢复时可能连带解除同 IP 的旧限制。
 */
export const releaseUserRegistrationBan = async (user: BanTarget) => {
  await delKv(emailKey(user.email))
  if (!user.ip) {
    return
  }

  const otherDeletedUserWithSameIp = await prisma.user.findFirst({
    where: { ip: user.ip, id: { not: user.id }, delete_time: { not: null } },
    select: { id: true }
  })
  if (!otherDeletedUserWithSameIp) {
    await delKv(ipKey(user.ip))
  }
}
