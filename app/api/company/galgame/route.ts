import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { prisma } from '~/prisma/index'
import { getPatchByCompanySchema } from '~/validations/company'
import { GalgameCardSelectField } from '~/constants/api/select'
import { getNSFWHeader } from '~/app/api/utils/getNSFWHeader'

export const getPatchByCompany = async (
    input: z.infer<typeof getPatchByCompanySchema>,
    nsfwEnable: Record<string, string | undefined>
) => {
    const { companyId, page, limit } = input
    const offset = (page - 1) * limit

    const [data, total] = await Promise.all([
        prisma.patch_company_relation.findMany({
            where: { company_id: companyId, patch: nsfwEnable },
            select: {
                patch: {
                    select: GalgameCardSelectField
                }
            },
            orderBy: { patch: { [input.sortField]: 'desc' } },
            take: limit,
            skip: offset
        }),
        prisma.patch_company_relation.count({
            where: { company_id: companyId, patch: nsfwEnable }
        })
    ])

    const patches = data.map((p) => p.patch)
    const galgames = patches.map((gal) => ({
        ...gal,
        tags: gal.tag.map((t) => t.tag.name).slice(0, 3),
        uniqueId: gal.unique_id
    }))

    return { galgames, total }
}

export const GET = async (req: NextRequest) => {
    const input = kunParseGetQuery(req, getPatchByCompanySchema)
    if (typeof input === 'string') {
        return NextResponse.json(input)
    }
    const nsfwEnable = getNSFWHeader(req)

    const response = await getPatchByCompany(input, nsfwEnable)
    return NextResponse.json(response)
}
