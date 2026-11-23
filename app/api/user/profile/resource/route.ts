import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { getUserInfoSchema } from '~/validations/user'
import { getNSFWHeader } from '~/app/api/utils/getNSFWHeader'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { getUserPatchResource } from './getUserPatchResource'

export async function GET(req: NextRequest) {
  const input = kunParseGetQuery(req, getUserInfoSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }
  const payload = await verifyHeaderCookie(req)
  if (!payload) {
    return NextResponse.json('用户登陆失效')
  }
  const nsfwEnable = getNSFWHeader(req)

  const response = await getUserPatchResource(input, nsfwEnable, payload)
  return NextResponse.json(response)
}
