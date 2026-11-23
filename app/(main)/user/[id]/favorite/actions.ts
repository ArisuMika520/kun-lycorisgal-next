'use server'

import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'
import { getFolders } from '~/app/api/user/profile/favorite/folder/get'
import { canViewUserContentById } from '~/app/api/utils/userVisibility'

export const kunGetActions = async (uid: number) => {
  const payload = await verifyHeaderCookie()
  if (!payload) {
    return '用户登陆失效'
  }

  // 被隐藏用户（伪删除 / shadow ban）的收藏夹对非本人、非管理员不展示
  if (!(await canViewUserContentById(uid, payload))) {
    return { folders: [], currentUserUid: payload.uid }
  }

  const response = await getFolders({}, uid, payload.uid)
  return { folders: response, currentUserUid: payload.uid }
}
