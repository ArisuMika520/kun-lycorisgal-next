import { NextRequest, NextResponse } from 'next/server'
import { kunParsePutBody } from '~/app/api/utils/parseQuery'
import { verifyHeaderCookie } from '~/middleware/_verifyHeaderCookie'
import { updateCompanySchema } from '~/validations/company'
import { updateCompany } from './update'

export const PUT = async (req: NextRequest) => {
    const input = await kunParsePutBody(req, updateCompanySchema)
    if (typeof input === 'string') {
        return NextResponse.json(input)
    }
    const payload = await verifyHeaderCookie(req)
    if (!payload) {
        return NextResponse.json('用户未登录')
    }
    if (payload.role < 3) {
        return NextResponse.json('本页面仅管理员可访问')
    }

    const response = await updateCompany(input)
    return NextResponse.json(response)
}
