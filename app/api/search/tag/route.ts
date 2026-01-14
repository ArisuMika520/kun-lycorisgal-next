import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParsePostBody } from '~/app/api/utils/parseQuery'
import { prisma } from '~/prisma/index'
import { Prisma } from '@prisma/client'
import { searchTagSchema } from '~/validations/search'

export const searchTag = async (input: z.infer<typeof searchTagSchema>) => {
  const { query } = input

  const buildSearchConditions = (searchTerms: string[]) => {
    return searchTerms.flatMap((q) => {
      const lowerQ = q.toLowerCase()
      const mode = Prisma.QueryMode.insensitive
      return [
        { name: { equals: q, mode } },
        { name: { startsWith: q, mode } },
        { name: { contains: q, mode } },
        { alias: { has: lowerQ } }
      ]
    })
  }

  const searchConditions = buildSearchConditions(query)

  const [tagsData, companiesData] = await Promise.all([
    prisma.patch_tag.findMany({
      where: {
        OR: searchConditions
      },
      select: {
        id: true,
        name: true,
        count: true,
        alias: true
      },
      orderBy: [
        { count: 'desc' }
      ],
      take: 10
    }),
    prisma.patch_company.findMany({
      where: {
        OR: searchConditions
      },
      select: {
        id: true,
        name: true,
        count: true,
        alias: true
      },
      orderBy: [
        { count: 'desc' }
      ],
      take: 10
    })
  ])

  const tags = tagsData.map((t) => ({
    type: 'tag' as const,
    ...t
  }))

  const companies = companiesData.map((c) => ({
    type: 'company' as const,
    ...c
  }))

  return [...tags, ...companies]
}

export const POST = async (req: NextRequest) => {
  const input = await kunParsePostBody(req, searchTagSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }

  const response = await searchTag(input)
  return NextResponse.json(response)
}
