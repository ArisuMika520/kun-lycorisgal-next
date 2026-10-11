import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { prisma } from '~/prisma/index'
import { duplicateSchema } from '~/validations/edit'
import { parseVndbWorkId } from '~/utils/vndbId'

export const duplicate = async (vndbId: string) => {
  const patch = await prisma.patch.findFirst({
    where: { vndb_id: { equals: vndbId, mode: 'insensitive' } }
  })
  if (patch) {
    return 'VNDB ID 重复, 本游戏已经被发布过了'
  }
  return {}
}

export const GET = async (req: NextRequest) => {
  const input = kunParseGetQuery(req, duplicateSchema)
  if (typeof input === 'string') {
    return NextResponse.json({ error: input }, { status: 400 })
  }

  const parsed = parseVndbWorkId(input.vndbId)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 })
  }

  const response = await duplicate(parsed.id)
  return NextResponse.json(response)
}
