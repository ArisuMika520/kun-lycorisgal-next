import type { AdminTodoItem } from '~/types/api/todo'

export type PrismaAdminTodo = {
  id: number
  title: string
  description: string
  status: number
  created: Date
  updated: Date
  user?: {
    id: number
    name: string
    avatar: string
  } | null
}

export const formatAdminTodo = (todo: PrismaAdminTodo): AdminTodoItem => ({
  id: todo.id,
  title: todo.title,
  description: todo.description,
  status: todo.status,
  created: todo.created.toISOString(),
  updated: todo.updated.toISOString(),
  creator: todo.user
    ? {
        id: todo.user.id,
        name: todo.user.name,
        avatar: todo.user.avatar
      }
    : null
})

export const mapAdminTodoList = (todos: PrismaAdminTodo[]): AdminTodoItem[] =>
  todos.map((todo) => formatAdminTodo(todo))
