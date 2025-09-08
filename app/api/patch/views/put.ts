import { prisma } from '~/prisma/index'

export const updatePatchViews = async (uniqueId: string) => {
  await prisma.patch.update({
    where: { unique_id: uniqueId },
    data: { view: { increment: 1 } }
  })
}