import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParsePostBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { createPatchFeedbackSchema } from '~/validations/patch'
import { createMessage } from '~/app/api/utils/message'
import { prisma } from '~/prisma'

export const createFeedback = async (
  input: z.infer<typeof createPatchFeedbackSchema>,
  uid: number
) => {
  const patch = await prisma.patch.findUnique({
    where: { id: input.patchId }
  })
  const user = await prisma.user.findUnique({
    where: { id: uid }
  })

  const STATIC_CONTENT = `用户: ${user?.name} 对 游戏: ${patch?.name} 提交了一个反馈\n\n反馈内容\n\n${input.content}`

  await createMessage({
    type: 'feedback',
    content: STATIC_CONTENT,
    sender_id: uid,
    link: patch?.unique_id ? `/${patch.unique_id}` : ''
  })

  return {}
}

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json()
    const result = createPatchFeedbackSchema.safeParse(body)
    
    if (!result.success) {
      // 提取第一个错误的消息
      const firstError = result.error.errors[0]
      const errorMessage = firstError?.message || '输入数据格式错误'
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 })
    }

    const response = await createFeedback(result.data, payload.uid)
    return NextResponse.json(response)
  } catch (error) {
    console.error('创建反馈失败:', error)
    return NextResponse.json({ error: '提交反馈失败' }, { status: 500 })
  }
}
