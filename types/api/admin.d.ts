import type { PatchResource } from '~/types/api/patch'
import type { PatchComment } from '~/types/api/comment'
import type { Message } from '~/types/api/message'

export type AdminStatsName =
  | 'user'
  | 'active'
  | 'patch'
  | 'patch_resource'
  | 'patch_comment'

export interface SumData {
  userCount: number
  galgameCount: number
  galgameResourceCount: number
  galgamePatchResourceCount: number
  galgameCommentCount: number
  topicCount: number
  pinnedTopicCount: number
}

export interface OverviewData {
  newUser: number
  newActiveUser: number
  newGalgame: number
  newGalgameResource: number
  newComment: number
  newTopic: number
  totalTopics: number
  pinnedTopics: number
}

export interface AdminUser {
  id: number
  name: string
  bio: string
  avatar: string
  role: number
  status: number
  dailyImageCount: number
  created: Date | string
  _count: {
    patch: number
    patch_resource: number
  }
}

export interface AdminCreator {
  id: number
  content: string
  status: number
  sender: KunUser | null
  patchResourceCount: number
  created: Date | string
}

export interface AdminGalgame {
  id: number
  uniqueId: string
  name: string
  banner: string
  user: KunUser
  created: Date | string
}

export interface AdminResource extends PatchResource {
  patchName: string
}

export interface AdminComment {
  id: number
  uniqueId: string
  user: {
    id: number
    name: string
    avatar: string | null
  }
  content: string
  patchName: string
  patchId: number
  like: number
  created: Date | string
  type: 'patch' | 'topic'
}

export type AdminFeedback = Message

export type AdminReport = Message

export interface AdminLog {
  id: number
  type: string
  user: KunUser
  content: string
  created: Date | string
}

export interface AdminRedirectConfig {
  enableRedirect: boolean
  excludedDomains: string[]
  delaySeconds: number
}
