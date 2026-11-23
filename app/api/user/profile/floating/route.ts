import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { prisma } from '~/prisma/index'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { canViewUserContent } from '~/app/api/utils/userVisibility'
import type { FloatingCardUser } from '~/types/api/user'

const uidSchema = z.object({
  uid: z.coerce.number().min(1).max(9999999)
})

/**
 * 悬浮用户卡片。已伪删除用户对非管理员视为不存在；
 * 内容被隐藏时（伪删除 / shadow ban）条目和资源计数对非本人、非管理员返回 0。
 */
export const getUserFloatingProfile = async (
  input: z.infer<typeof uidSchema>,
  viewer: { uid: number; role: number }
) => {
  const currentUserUid = viewer.uid
  const data = await prisma.user.findUnique({
    where: { id: input.uid },
    include: {
      _count: {
        select: {
          follower: true,
          patch: true,
          patch_resource: true
        }
      },
      following: true
    }
  })
  if (!data || (data.delete_time && viewer.role < 3)) {
    return '未找到用户'
  }
  const canViewContent = canViewUserContent(data, viewer)

  const followerUserUid = data.following.map((f) => f.follower_id)

  const user: FloatingCardUser = {
    id: data.id,
    name: data.name,
    avatar: data.avatar,
    bio: data.bio,
    moemoepoint: data.moemoepoint,
    role: data.role,
    isFollow: followerUserUid.includes(currentUserUid),
    _count: canViewContent
      ? data._count
      : { ...data._count, patch: 0, patch_resource: 0 }
  }

  return user
}

export async function GET(req: NextRequest) {
  const input = kunParseGetQuery(req, uidSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }
  const payload = await verifyHeaderCookie(req)

  const user = await getUserFloatingProfile(input, {
    uid: payload?.uid ?? 0,
    role: payload?.role ?? 0
  })
  return NextResponse.json(user)
}
