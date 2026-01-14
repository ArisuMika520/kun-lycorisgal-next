import { prisma } from '~/prisma/index'

export const handleBatchPatchCompanies = async (
    patchId: number,
    companyArray: string[],
    uid: number
) => {
    console.log('handleBatchPatchCompanies开始执行，游戏ID:', patchId, '公司数量:', companyArray.length)
    const validCompanies = companyArray.filter(Boolean)
    console.log('有效公司数量:', validCompanies.length)

    console.log('查询现有公司关系...')
    const existingRelations = await prisma.patch_company_relation.findMany({
        where: { patch_id: patchId },
        include: { company: true }
    })
    console.log('现有公司关系数量:', existingRelations.length)

    const currentCompanyNames = existingRelations.map((rel) => rel.company.name)
    const companiesToAdd = validCompanies.filter((name) => !currentCompanyNames.includes(name))
    const companiesToRemove = existingRelations
        .filter((rel) => !validCompanies.includes(rel.company.name))
        .map((rel) => rel.company_id)

    console.log('需要添加的公司:', companiesToAdd.length, '需要移除的公司:', companiesToRemove.length)

    const existingCompanies =
        companiesToAdd.length > 0
            ? await prisma.patch_company.findMany({
                where: {
                    OR: [
                        { name: { in: companiesToAdd } },
                        { alias: { hasSome: companiesToAdd } }
                    ]
                }
            })
            : []

    const foundCompanyNames = new Set(existingCompanies.map((c) => c.name))
    const foundCompanyAliases = new Set(
        existingCompanies.flatMap((c) => (c.alias as string[]) || [])
    )

    const companiesToCreate = [
        ...new Set(
            companiesToAdd.filter(
                (name) => !foundCompanyNames.has(name) && !foundCompanyAliases.has(name)
            )
        )
    ]

    console.log('开始数据库事务处理...')
    await prisma.$transaction(
        async (tx) => {
            if (companiesToCreate.length > 0) {
                console.log('创建新公司，数量:', companiesToCreate.length)
                await tx.patch_company.createMany({
                    data: companiesToCreate.map((name) => ({
                        user_id: uid,
                        name
                    }))
                })
                console.log('新公司创建完成')
            }

            const newCompanies =
                companiesToCreate.length > 0
                    ? await tx.patch_company.findMany({
                        where: { name: { in: companiesToCreate } },
                        select: { id: true, name: true }
                    })
                    : []
            console.log('查询到新创建的公司数量:', newCompanies.length)

            const allCompanyIds = [
                ...existingCompanies.map((c) => c.id),
                ...newCompanies.map((c) => c.id)
            ]
            console.log('所有需要关联的公司ID数量:', allCompanyIds.length)

            if (allCompanyIds.length > 0) {
                console.log('创建公司关系...')
                await tx.patch_company_relation.createMany({
                    data: allCompanyIds.map((companyId) => ({
                        patch_id: patchId,
                        company_id: companyId
                    }))
                })
                console.log('公司关系创建完成')

                console.log('更新公司计数...')
                await tx.patch_company.updateMany({
                    where: { id: { in: allCompanyIds } },
                    data: { count: { increment: 1 } }
                })
                console.log('公司计数更新完成')
            }

            if (companiesToRemove.length > 0) {
                console.log('删除旧公司关系，数量:', companiesToRemove.length)
                await tx.patch_company_relation.deleteMany({
                    where: { patch_id: patchId, company_id: { in: companiesToRemove } }
                })
                console.log('旧公司关系删除完成')

                console.log('减少旧公司计数...')
                await tx.patch_company.updateMany({
                    where: { id: { in: companiesToRemove } },
                    data: { count: { decrement: 1 } }
                })
                console.log('旧公司计数减少完成')
            }
        },
        { timeout: 60000 }
    )
    console.log('数据库事务处理完成')

    return { success: true }
}
