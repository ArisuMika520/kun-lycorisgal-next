import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { updateCompanySchema } from '~/validations/company'
import type { CompanyDetail } from '~/types/api/company'

export const updateCompany = async (input: z.infer<typeof updateCompanySchema>) => {
    const { companyId, name, introduction = '', alias = [] } = input

    const existingCompany = await prisma.patch_company.findFirst({
        where: {
            OR: [{ name }, { alias: { has: name } }]
        }
    })
    if (existingCompany && existingCompany.id !== companyId) {
        return '这个会社已经存在了'
    }

    const newCompany: CompanyDetail = await prisma.patch_company.update({
        where: { id: companyId },
        data: {
            name,
            introduction,
            alias
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    avatar: true
                }
            }
        }
    })

    return newCompany
}
