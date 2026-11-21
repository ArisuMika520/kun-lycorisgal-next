import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { todoListQuerySchema } from '~/validations/todo'
import { getTodoList } from '~/app/api/admin/todo/get'

// 公开待办列表（/todo 页面使用），只读、无需登录。
// 放在 /api/admin 之外，是因为中间件会拦截所有不带会话 Cookie 的 /api/admin/* 请求。
// 待办的增改仍走需要管理员权限的 /api/admin/todo。
export const GET = async (req: NextRequest) => {
  const query = kunParseGetQuery(req, todoListQuerySchema)
  if (typeof query === 'string') {
    return NextResponse.json({ error: query }, { status: 400 })
  }

  return NextResponse.json(await getTodoList(query))
}
