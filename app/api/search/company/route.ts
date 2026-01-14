import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParsePostBody } from '~/app/api/utils/parseQuery'
import { prisma } from '~/prisma/index'
import { searchCompanySchema } from '~/validations/search'

export const searchCompany = async (input: z.infer<typeof searchCompanySchema>) => {
    const { query } = input

    const data = await prisma.patch_company.findMany({
        where: {
            OR: query.flatMap((q) => [
                { name: { contains: q, mode: 'insensitive' } },
                { alias: { has: q } }
            ])
        },
        select: {
            id: true,
            name: true,
            count: true,
            alias: true
        },
        orderBy: { count: 'desc' },
        take: 100
    })

    const companies = data.map((t) => ({
        type: 'company',
        ...t
    }))

    return companies
}

export const POST = async (req: NextRequest) => {
    const input = await kunParsePostBody(req, searchCompanySchema)
    if (typeof input === 'string') {
        return NextResponse.json(input)
    }

    const response = await searchCompany(input)
    return NextResponse.json(response)
}
