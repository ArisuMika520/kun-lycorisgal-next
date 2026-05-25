import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { patchCommentUpdateSchema } from '~/validations/patch'

export const updateComment = async (
  input: z.infer<typeof patchCommentUpdateSchema>,
  uid: number
) => {

  const { commentId, content, type } = input

  let comment: any

  if (type === 'patch') {
    comment = await prisma.patch_comment.findUnique({
      where: { id: commentId }
    })
  }
  comment = await prisma.topic_comment.findUnique({
    where: { id: commentId }
  })

  if (!comment) {
    return '未找到对应的评论'
  }
  const admin = await prisma.user.findUnique({ where: { id: uid } })
  if (!admin) {
    return '未找到该管理员'
  }


  return await prisma.$transaction(async (prisma) => {
    if (type === 'patch') {
      await prisma.patch_comment.update({
        where: { id: commentId },
        data: {
          content,
          edit: Date.now().toString()
        },
        include: {
          user: true,
          like_by: {
            include: {
              user: true
            }
          }
        }
      })
    }
    await prisma.topic_comment.update({
      where: { id: commentId },
      data: {
        content,
        updated: new Date()
      },
      include: {
        user: true,
        like_by: {
          include: {
            user: true
          }
        }
      }
    })

    await prisma.admin_log.create({
      data: {
        type: 'update',
        user_id: uid,
        content: `管理员 ${admin.name} 更新了一条评论的内容\n原评论: ${JSON.stringify(comment)}`
      }
    })

    return {}
  })
}
