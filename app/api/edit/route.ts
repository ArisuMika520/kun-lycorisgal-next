import { NextRequest, NextResponse } from 'next/server'
import { kunParseFormData, kunParsePutBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { patchCreateSchema, patchUpdateSchema } from '~/validations/edit'
import { createGalgame } from './create'
import { updateGalgame } from './update'
import { prisma } from '~/prisma'

const checkStringArrayValid = (type: 'alias' | 'tag', aliasString: string) => {
  const label = type === 'alias' ? '别名' : '标签'

  const aliasArray = JSON.parse(aliasString) as string[]
  if (aliasArray.length > 100) {
    return `您最多使用 100 个${label}`
  }
  const maxLength = aliasArray.some((alias) => alias.length > 500)
  if (maxLength) {
    return `单个${label}的长度不可超过 500 个字符`
  }
  const minLength = aliasArray.some((alias) => alias.trim().length === 0)
  if (minLength) {
    return `单个${label}至少一个字符`
  }
  return aliasArray.map((a) => a.trim())
}

export const POST = async (req: NextRequest) => {
  try {
    console.log('POST /api/edit 开始处理请求')
    const input = await kunParseFormData(req, patchCreateSchema)
    if (typeof input === 'string') {
      console.error('表单数据解析失败:', input)
      return NextResponse.json({ error: input }, { status: 400 })
    }
    console.log('表单数据解析成功')
    
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      console.error('用户未登录')
      return NextResponse.json({ error: '用户未登录' }, { status: 401 })
    }
    console.log('用户验证成功，用户ID:', payload.uid)
    
    // 允许所有登录用户创建游戏
    // if (payload.role < 3) {
    //   return NextResponse.json({ error: '本页面仅管理员可访问' }, { status: 403 })
    // }

    const { alias, banner, tag, ...rest } = input
    console.log('开始验证别名和标签')
    
    const aliasResult = checkStringArrayValid('alias', alias)
    if (typeof aliasResult === 'string') {
      console.error('别名验证失败:', aliasResult)
      return NextResponse.json({ error: aliasResult }, { status: 400 })
    }
    
    const tagResult = checkStringArrayValid('tag', tag)
    if (typeof tagResult === 'string') {
      console.error('标签验证失败:', tagResult)
      return NextResponse.json({ error: tagResult }, { status: 400 })
    }
    
    console.log('别名和标签验证成功')
    console.log('开始处理banner图片')
    const bannerArrayBuffer = await new Response(banner)?.arrayBuffer()
    console.log('Banner处理完成，调用createGalgame')

    const response = await createGalgame(
      { alias: aliasResult, tag: tagResult, banner: bannerArrayBuffer, ...rest },
      payload.uid
    )
    console.log('createGalgame调用完成')
    
    if (typeof response === 'string') {
      return NextResponse.json({ error: response }, { status: 500 })
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/edit:', error)
    return NextResponse.json({ error: '创建游戏时发生错误' }, { status: 500 })
  }
}

export const PUT = async (req: NextRequest) => {
  try {
    console.log('PUT /api/edit 开始处理请求')
    const input = await kunParsePutBody(req, patchUpdateSchema)
    if (typeof input === 'string') {
      console.error('PUT请求数据解析失败:', input)
      return NextResponse.json({ error: input }, { status: 400 })
    }
    console.log('PUT请求数据解析成功，游戏ID:', input.id)
    
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      console.error('用户未登录')
      return NextResponse.json({ error: '用户未登录' }, { status: 401 })
    }
    console.log('用户验证成功，用户ID:', payload.uid)

    // 检查用户是否有权限编辑该游戏（游戏创建者或管理员）
    console.log('检查游戏权限...')
    const patch = await prisma.patch.findUnique({ 
      where: { id: input.id },
      select: { user_id: true }
    })
    
    if (!patch) {
      console.error('游戏不存在，ID:', input.id)
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 })
    }
    
    if (payload.uid !== patch.user_id && payload.role < 3) {
      console.error('用户无权限编辑游戏，用户ID:', payload.uid, '游戏创建者ID:', patch.user_id)
      return NextResponse.json({ error: '您没有权限编辑此游戏' }, { status: 403 })
    }
    console.log('权限检查通过')

    console.log('开始更新游戏信息...')
    const response = await updateGalgame(input, payload.uid)
    
    if (typeof response === 'string') {
      console.error('updateGalgame返回错误:', response)
      return NextResponse.json({ error: response }, { status: 500 })
    }
    
    console.log('游戏信息更新成功')
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in PUT /api/edit:', error)
    return NextResponse.json({ error: '更新游戏时发生错误' }, { status: 500 })
  }
}
