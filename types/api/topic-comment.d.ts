export interface TopicComment {
  id: number
  content: string
  user: {
    id: number
    name: string
    avatar: string | null
  }
  parent_id?: number
  parent?: {
    id: number
    content: string
    user: {
      id: number
      name: string
      avatar: string | null
    }
    like_count: number
    created: string
    updated: string
  }
  replies?: TopicComment[]
  like_count: number
  isLiked?: boolean
  created: string
  updated: string
}

export interface TopicCommentResponse {
  comments: TopicComment[]
  total: number
  page: number
  limit: number
}