'use server'

import { prisma } from '~/prisma/index'
import { mapAdminTodoList } from '~/lib/todo'
import type { AdminTodoItem } from '~/types/api/todo'

export const kunGetTodoList = async (): Promise<AdminTodoItem[]> => {
  const todos = await prisma.admin_todo.findMany({
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
    }
  })

  return mapAdminTodoList(todos)
}
