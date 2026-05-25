import { z } from 'zod'
import { prisma } from '~/prisma/index'

const commentIdSchema = z.object({
  commentId: z.coerce
    .number({ message: '评论 ID 必须为数字' })
    .min(1)
    .max(9999999),
  type: z.enum(['patch', 'topic'], { message: 'type 必须为 patch 或 topic' })
})

const deleteCommentWithReplies = async (input: z.infer<typeof commentIdSchema>) => {
  const { commentId, type } = input

  let childComments: any[] = []

  if (type === 'patch') {
    childComments = await prisma.patch_comment.findMany({
      where: { parent_id: commentId }
    })
  }
  childComments = await prisma.topic_comment.findMany({
    where: { parent_id: commentId }
  })

  for (const child of childComments) {
    await deleteCommentWithReplies(child.id)
  }

  if (type === 'patch') {
    await prisma.patch_comment.delete({
      where: { id: commentId }
    })
  }
  await prisma.topic_comment.delete({
    where: { id: commentId }
  })
}

export const deleteComment = async (
  input: z.infer<typeof commentIdSchema>,
  uid: number
) => {

  let comment: any
  if (input.type === 'patch') {
    comment = await prisma.patch_comment.findUnique({
      where: { id: input.commentId }
    })
  }

  if (input.type === 'topic') {
    comment = await prisma.topic_comment.findUnique({
      where: { id: input.commentId }
    })
  }

  if (!comment) {
    return '未找到对应的评论'
  }

  const admin = await prisma.user.findUnique({ where: { id: uid } })
  if (!admin) {
    return '未找到该管理员'
  }

  return await prisma.$transaction(async (prisma) => {
    await deleteCommentWithReplies(input)

    await prisma.admin_log.create({
      data: {
        type: 'delete',
        user_id: uid,
        content: `管理员 ${admin.name} 删除了一条评论\n原评论: ${JSON.stringify(comment)}`
      }
    })

    return {}
  })
}
