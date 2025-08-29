export interface TopicComment {
  id: number
  content: string
  like_count: number
  isLiked: boolean
  user: {
    id: number
    name: string
    avatar: string
  }
  topic_id: number
  parent_id: number | null
  parent?: {
    id: number
    content: string
    user: {
      id: number
      name: string
      avatar: string
    }
    created: string
    updated: string
    like_count: number
  }
  replies?: TopicComment[]
  created: string
  updated: string
}

export interface CreateTopicCommentRequest {
  topicId: number
  content: string
  parentId?: number
}

export interface UpdateTopicCommentRequest {
  commentId: number
  content: string
}

export interface DeleteTopicCommentRequest {
  commentId: number
}

export interface LikeTopicCommentRequest {
  commentId: number
}

export interface GetTopicCommentsRequest {
  topicId: number
  sortField?: 'created' | 'like_count'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface GetTopicCommentsResponse {
  comments: TopicComment[]
  total: number
}