import { NextRequest, NextResponse } from 'next/server'
import {
  kunParseDeleteQuery,
  kunParseGetQuery,
  kunParsePutBody
} from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import {
  adminPaginationSchema,
  adminUpdateUserSchema,
  adminUserIdSchema
} from '~/validations/admin'
import { getUserInfo } from './get'
import { updateUser } from './update'
import { deleteUser } from './delete'

export const GET = async (req: NextRequest) => {
  const input = kunParseGetQuery(req, adminPaginationSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }
  if (payload.role < 3) {
    return NextResponse.json('本页面仅管理员可访问')
  }

  const response = await getUserInfo(input)
  return NextResponse.json(response)
}

export const PUT = async (req: NextRequest) => {
  const input = await kunParsePutBody(req, adminUpdateUserSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }
  if (payload.role < 3) {
    return NextResponse.json('本页面仅管理员可访问')
  }

  const response = await updateUser(input, payload.uid)
  return NextResponse.json(response)
}

export const DELETE = async (req: NextRequest) => {
  // 伪删除用户，见 ./delete.ts
  const input = kunParseDeleteQuery(req, adminUserIdSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户未登录')
  }
  if (payload.role < 4) {
    return NextResponse.json('本页面仅超级管理员可访问')
  }

  const response = await deleteUser(input, payload.uid)
  return NextResponse.json(response)
}
