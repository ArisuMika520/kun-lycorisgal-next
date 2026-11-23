import { prisma } from '~/prisma/index'
import type { Prisma } from '@prisma/client'

/**
 * 用户内容可见性规则（伪删除 + shadow ban）。
 *
 * - 伪删除（`user.delete_time` 非空）：账号无法登录，其发布的资源、评论、话题、
 *   站内消息对所有人隐藏；数据保留，恢复后重新可见。
 * - shadow ban（`user.shadow_ban_time` 非空）：本人照常使用、看到自己的内容；
 *   其他人（包括管理员浏览公开页面时）都看不到。管理员只能在该用户的个人主页查看。
 *
 * Galgame 条目（`patch`）属于站点资料，不受这里的规则影响。
 * 新增展示用户内容的公开查询时，必须给作者关系加上 `visibleAuthorWhere`。
 */

/** 对外可见的作者：未伪删除且未被 shadow ban */
export const VISIBLE_AUTHOR_WHERE = {
  delete_time: null,
  shadow_ban_time: null
} satisfies Prisma.userWhereInput

/**
 * 公开内容列表的作者过滤条件。
 * @param viewerUid 当前访问者 uid，未登录传 0 / undefined。shadow ban 用户本人
 *   仍能看到自己的内容；伪删除用户的会话已被吊销，这里再限定 `delete_time: null`，
 *   即使残留旧会话也看不到自己的内容。
 */
export const visibleAuthorWhere = (
  viewerUid?: number
): Prisma.userWhereInput =>
  viewerUid
    ? { OR: [VISIBLE_AUTHOR_WHERE, { id: viewerUid, delete_time: null }] }
    : VISIBLE_AUTHOR_WHERE

/**
 * 站内消息的发送者过滤条件：系统消息（无发送者）始终可见，
 * 来自伪删除或 shadow ban 用户的消息（提及、回复、关注等）不展示给收件人。
 */
export const VISIBLE_MESSAGE_SENDER_WHERE: Prisma.user_messageWhereInput = {
  OR: [{ sender_id: null }, { sender: { is: VISIBLE_AUTHOR_WHERE } }]
}

interface HiddenStateUser {
  id: number
  delete_time: Date | null
  shadow_ban_time: Date | null
}

interface Viewer {
  uid: number
  role: number
}

/**
 * 访问者能否查看某个用户主页上的内容（资源、评论、收藏夹等）。
 * 被隐藏的用户只对本人（shadow ban 情况）和管理员可见。
 */
export const canViewUserContent = (user: HiddenStateUser, viewer: Viewer) => {
  if (user.delete_time === null && user.shadow_ban_time === null) {
    return true
  }
  if (viewer.role >= 3) {
    return true
  }
  return user.delete_time === null && viewer.uid === user.id
}

/**
 * 按 uid 查询并判断访问者能否查看该用户主页上的内容，用户不存在时返回 false。
 * 供个人主页各标签（资源、评论、收藏夹）在查询前做统一拦截。
 */
export const canViewUserContentById = async (uid: number, viewer: Viewer) => {
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, delete_time: true, shadow_ban_time: true }
  })
  return user ? canViewUserContent(user, viewer) : false
}
