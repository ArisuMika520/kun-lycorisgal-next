export interface Topic {
  id: number
  title: string
  content: string
  status: number
  is_pinned: boolean
  view_count: number
  like_count: number
  user: {
    id: number
    name: string
    avatar: string
  }
  created: Date
  updated: Date
  isLiked?: boolean // 当前用户是否已点赞
}

export interface TopicCard {
  id: number
  title: string
  content: string // 截取的内容预览
  is_pinned: boolean
  view_count: number
  like_count: number
  comment_count: number
  user: {
    id: number
    name: string
    avatar: string
  }
  created: string
  updated: string
}