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
  todoListQuerySchema,
  todoUpdateSchema
} from '~/validations/todo'
import { formatAdminTodo } from '~/lib/todo'
import { getTodoList } from './get'
import type { PrismaAdminTodo } from '~/lib/todo'

// 后台待办列表，仅管理员可读。公开页 /todo 使用只读的 GET /api/todo。
export async function GET(req: NextRequest) {
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }
  if (payload.role < 3) {
    return NextResponse.json('本页面仅管理员可访问')
  }

  const query = kunParseGetQuery(req, todoListQuerySchema)
  if (typeof query === 'string') {
    return NextResponse.json(query)
  }

  return NextResponse.json(await getTodoList(query))
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
