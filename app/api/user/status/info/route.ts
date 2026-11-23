import { NextRequest, NextResponse } from 'next/server'
import { kunParseGetQuery } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { getProfileSchema, getUserProfile } from './getUserProfile'

export async function GET(req: NextRequest) {
  const input = kunParseGetQuery(req, getProfileSchema)
  if (typeof input === 'string') {
    return NextResponse.json(input)
  }
  const payload = await verifyHeaderCookie(req)

  const user = await getUserProfile(input, {
    uid: payload?.uid ?? 0,
    role: payload?.role ?? 0
  })
  return NextResponse.json(user)
}
