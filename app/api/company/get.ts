import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { getCompanyByIdSchema } from '~/validations/company'
import type { CompanyDetail } from '~/types/api/company'

export const getCompanyById = async (input: z.infer<typeof getCompanyByIdSchema>) => {
    const { companyId } = input

    const company: CompanyDetail | null = await prisma.patch_company.findUnique({
        where: { id: companyId },
        select: {
            id: true,
            name: true,
            count: true,
            alias: true,
            introduction: true,
            created: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    avatar: true
                }
            }
        }
    })
    if (!company) {
        return '未找到会社'
    }

    return company
}
