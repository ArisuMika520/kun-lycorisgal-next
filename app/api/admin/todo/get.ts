import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { mapAdminTodoList } from '~/lib/todo'
import { todoListQuerySchema } from '~/validations/todo'
import type { PrismaAdminTodo } from '~/lib/todo'

/**
 * 查询待办列表。
 *
 * 后台 `GET /api/admin/todo` 与公开 `GET /api/todo` 共用此函数，二者返回结构一致。
 * 传入 `limit` 时分页，并把越界页码收敛到 [1, 总页数]；不传则返回全部。
 */
export const getTodoList = async (
  query: z.infer<typeof todoListQuerySchema>
) => {
  const statusKey = query.status ?? 'all'
  const requestedPage = query.page ?? 1
  const limit = query.limit

  const where =
    statusKey === 'in_progress'
      ? { status: 0 }
      : statusKey === 'completed'
        ? { status: 1 }
        : {}

  const total = await prisma.admin_todo.count({ where })

  let currentPage = 1
  let take: number | undefined
  let skip: number | undefined

  if (limit !== undefined) {
    const totalPages = Math.max(1, Math.ceil(total / limit))
    currentPage = Math.min(Math.max(requestedPage, 1), totalPages)
    take = limit
    skip = (currentPage - 1) * limit
  }

  const todos = await prisma.admin_todo.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    },
    orderBy: {
      created: 'desc'
    },
    ...(take !== undefined ? { take, skip } : {})
  })

  return {
    todos: mapAdminTodoList(todos as PrismaAdminTodo[]),
    total,
    page: take !== undefined ? currentPage : 1,
    limit: take ?? total,
    status: statusKey
  }
}
