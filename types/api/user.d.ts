export interface UserInfo {
  id: number
  requestUserUid: number
  name: string
  email: string
  avatar: string
  bio: string
  role: number
  status: number
  registerTime: string
  moemoepoint: number
  follower: number
  following: number
  isFollow: boolean
  // 已伪删除 / 已 shadow ban。仅管理员访问时如实返回，其他人（包括本人）恒为 false
  isDeleted: boolean
  isShadowBanned: boolean
  _count: {
    patch: number
    patch_resource: number
    patch_comment: number
    patch_favorite: number
    send_message: number
  }
}

export interface UserFollow {
  id: number
  name: string
  avatar: string
  bio: string
  follower: number
  following: number
  isFollow: boolean
}

export interface UserResource {
  id: number
  patchUniqueId: string
  patchId: number
  patchName: string
  patchBanner: string
  size: string
  type: string[]
  language: string[]
  platform: string[]
  created: string
}

export interface UserContribute {
  id: number
  patchUniqueId: string
  patchId: number
  patchName: string
  created: string
}

export interface UserComment {
  id: number
  patchUniqueId: string
  content: string
  like: number
  userId: number
  patchId: number
  patchName: string
  created: string
  quotedUserUid?: number | null
  quotedUsername?: string | null
}

export interface FloatingCardUser {
  id: number
  name: string
  avatar: string
  bio: string
  moemoepoint: number
  role: number
  isFollow: boolean
  _count: {
    follower: number
    patch: number
    patch_resource: number
  }
}

export interface UserFavoritePatchFolder {
  id: number
  name: string
  description?: string
  is_public: boolean
  isAdd: boolean
  _count: { patch: number }
}
