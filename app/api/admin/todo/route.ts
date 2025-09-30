import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '~/prisma/index'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import {
  kunParseGetQuery,
  kunParsePostBody,
  kunParsePutBody
} from '~/app/api/utils/parseQuery'
import {
  todoCreateSchema,
  todoUpdateSchema,
  todoListQuerySchema
} from '~/validations/todo'
import { formatAdminTodo, mapAdminTodoList } from '~/lib/todo'
import type { PrismaAdminTodo } from '~/lib/todo'

export async function GET(req: NextRequest) {
  const query = kunParseGetQuery(req, todoListQuerySchema)
  if (typeof query === 'string') {
    return NextResponse.json(query)
  }

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

  let currentPage = requestedPage
  let take: number | undefined
  let skip: number | undefined

  if (limit !== undefined) {
    const totalPages = Math.max(1, Math.ceil(total / limit))
    currentPage = Math.min(Math.max(requestedPage, 1), totalPages)
    take = limit
    skip = (currentPage - 1) * limit
  } else {
    currentPage = 1
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
      created: 'asc'
    },
    ...(take !== undefined
      ? {
          take,
          skip
        }
      : {})
  })

  return NextResponse.json({
    todos: mapAdminTodoList(todos as PrismaAdminTodo[]),
    total,
    page: take !== undefined ? currentPage : 1,
    limit: take ?? total,
    status: statusKey
  })
}

export async function POST(req: NextRequest) {
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }
  if (payload.role < 3) {
    return NextResponse.json('本页面仅管理员可访问')
  }

  const input = await kunParsePostBody(req, todoCreateSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }

  const todo = await prisma.admin_todo.create({
    data: {
      title: input.title,
      description: input.description ?? '',
      status: 0,
      user_id: payload.uid
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  })

  return NextResponse.json(formatAdminTodo(todo as PrismaAdminTodo))
}

export async function PATCH(req: NextRequest) {
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }
  if (payload.role < 3) {
    return NextResponse.json('本页面仅管理员可访问')
  }

  const input = await kunParsePutBody(req, todoUpdateSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }

  const { id, title, description, status } = input

  const todo = await prisma.admin_todo.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(status !== undefined ? { status } : {})
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  })

  return NextResponse.json(formatAdminTodo(todo as PrismaAdminTodo))
}
