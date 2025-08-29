import { prisma } from '~/prisma/index'

export const handleBatchPatchTags = async (
  patchId: number,
  tagArray: string[],
  uid: number
) => {
  console.log('handleBatchPatchTags开始执行，游戏ID:', patchId, '标签数量:', tagArray.length)
  const validTags = tagArray.filter(Boolean)
  console.log('有效标签数量:', validTags.length)

  console.log('查询现有标签关系...')
  const existingRelations = await prisma.patch_tag_relation.findMany({
    where: { patch_id: patchId },
    include: { tag: true }
  })
  console.log('现有标签关系数量:', existingRelations.length)

  const currentTagNames = existingRelations.map((rel) => rel.tag.name)
  const tagsToAdd = validTags.filter((tag) => !currentTagNames.includes(tag))
  const tagsToRemove = existingRelations
    .filter((rel) => !validTags.includes(rel.tag.name))
    .map((rel) => rel.tag_id)
  
  console.log('需要添加的标签:', tagsToAdd.length, '需要移除的标签:', tagsToRemove.length)

  const existingTags =
    tagsToAdd.length > 0
      ? await prisma.patch_tag.findMany({
          where: {
            OR: [
              { name: { in: tagsToAdd } },
              { alias: { hasSome: tagsToAdd } }
            ]
          }
        })
      : []

  const foundTagNames = new Set(existingTags.map((tag) => tag.name))
  const foundTagAliases = new Set(
    existingTags.flatMap((tag) => (tag.alias as string[]) || [])
  )
  
  const tagsToCreate = [
    ...new Set(
      tagsToAdd.filter(
        (tag) => !foundTagNames.has(tag) && !foundTagAliases.has(tag)
      )
    )
  ]

  console.log('开始数据库事务处理...')
  await prisma.$transaction(
    async (tx) => {
      if (tagsToCreate.length > 0) {
        console.log('创建新标签，数量:', tagsToCreate.length)
        await tx.patch_tag.createMany({
          data: tagsToCreate.map((name) => ({
            user_id: uid,
            name
          }))
        })
        console.log('新标签创建完成')
      }

      const newTags =
        tagsToCreate.length > 0
          ? await tx.patch_tag.findMany({
              where: { name: { in: tagsToCreate } },
              select: { id: true, name: true }
            })
          : []
      console.log('查询到新创建的标签数量:', newTags.length)

      const allTagIds = [
        ...existingTags.map((t) => t.id),
        ...newTags.map((t) => t.id)
      ]
      console.log('所有需要关联的标签ID数量:', allTagIds.length)

      if (allTagIds.length > 0) {
        console.log('创建标签关系...')
        await tx.patch_tag_relation.createMany({
          data: allTagIds.map((tagId) => ({
            patch_id: patchId,
            tag_id: tagId
          }))
        })
        console.log('标签关系创建完成')

        console.log('更新标签计数...')
        await tx.patch_tag.updateMany({
          where: { id: { in: allTagIds } },
          data: { count: { increment: 1 } }
        })
        console.log('标签计数更新完成')
      }

      if (tagsToRemove.length > 0) {
        console.log('删除旧标签关系，数量:', tagsToRemove.length)
        await tx.patch_tag_relation.deleteMany({
          where: { patch_id: patchId, tag_id: { in: tagsToRemove } }
        })
        console.log('旧标签关系删除完成')

        console.log('减少旧标签计数...')
        await tx.patch_tag.updateMany({
          where: { id: { in: tagsToRemove } },
          data: { count: { decrement: 1 } }
        })
        console.log('旧标签计数减少完成')
      }
    },
    { timeout: 60000 }
  )
  console.log('数据库事务处理完成')

  return { success: true }
}
