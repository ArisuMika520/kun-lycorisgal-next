import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { prisma } from '~/prisma/index'
import { getCompanySchema } from '~/validations/company'
import type { Company } from '~/types/api/company'

export const getCompany = async (input: z.infer<typeof getCompanySchema>) => {
    const { page, limit } = input
    const offset = (page - 1) * limit

    const [data, total] = await Promise.all([
        prisma.patch_company.findMany({
            take: limit,
            skip: offset,
            orderBy: { count: 'desc' }
        }),
        prisma.patch_company.count()
    ])

    const companies: Company[] = data.map((company) => ({
        id: company.id,
        name: company.name,
        count: company.count,
        alias: company.alias
    }))

    return { companies, total }
}

export const GET = async (req: NextRequest) => {
    const input = kunParseGetQuery(req, getCompanySchema)
    if (typeof input === 'string') {
        return NextResponse.json(input)
    }

    const response = await getCompany(input)
    return NextResponse.json(response)
}
