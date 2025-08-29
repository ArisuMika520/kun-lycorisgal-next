import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { patchUpdateSchema } from '~/validations/edit'
import { handleBatchPatchTags } from './batchTag'

export const updateGalgame = async (
  input: z.infer<typeof patchUpdateSchema>,
  uid: number
) => {
  console.log('updateGalgame开始执行，游戏ID:', input.id)
  
  const patch = await prisma.patch.findUnique({ where: { id: input.id } })
  if (!patch) {
    console.error('未找到对应的游戏，ID:', input.id)
    return '该 ID 下未找到对应 Galgame'
  }
  console.log('找到游戏记录')

  if (input.vndbId) {
    console.log('检查VNDB ID重复性...')
    const galgame = await prisma.patch.findUnique({
      where: { vndb_id: input.vndbId }
    })
    if (galgame && galgame.id !== input.id) {
      console.error('VNDB ID重复，冲突游戏ID:', galgame.unique_id)
      return `Galgame VNDB ID 与游戏 ID 为 ${galgame.unique_id} 的游戏重复`
    }
    console.log('VNDB ID检查通过')
  }

  const { id, vndbId, name, alias, introduction, contentLimit, released } =
    input

  console.log('开始更新游戏基本信息...')
  await prisma.patch.update({
    where: { id },
    data: {
      name,
      vndb_id: vndbId ? vndbId : null,
      introduction,
      content_limit: contentLimit,
      released
    }
  })
  console.log('游戏基本信息更新完成')

  console.log('开始更新游戏别名...')
  await prisma.$transaction(async (prisma) => {
    await prisma.patch_alias.deleteMany({
      where: { patch_id: id }
    })

    const aliasData = alias.map((name) => ({
      name,
      patch_id: id
    }))

    await prisma.patch_alias.createMany({
      data: aliasData,
      skipDuplicates: true
    })
  })
  console.log('游戏别名更新完成')

  if (input.tag.length) {
    console.log('开始处理游戏标签，标签数量:', input.tag.length)
    await handleBatchPatchTags(input.id, input.tag, uid)
    console.log('游戏标签处理完成')
  }

  console.log('updateGalgame执行完成')
  return {}
}
