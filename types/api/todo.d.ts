export interface AdminTodoItem {
  id: number
  title: string
  description: string
  status: number
  creator?: {
    id: number
    name: string
    avatar: string
  } | null
  created: string
  updated: string
}
