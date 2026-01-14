'use server'

import { z } from 'zod'
import { safeParseSchema } from '~/utils/actions/safeParseSchema'
import { getCompanyById } from '~/app/api/company/get'
import { getPatchByCompany } from '~/app/api/company/galgame/route'
import { getNSFWHeader } from '~/utils/actions/getNSFWHeader'
import { getPatchByCompanySchema, getCompanyByIdSchema } from '~/validations/company'

export const kunGetCompanyByIdActions = async (
    params: z.infer<typeof getCompanyByIdSchema>
) => {
    const input = safeParseSchema(getCompanyByIdSchema, params)
    if (typeof input === 'string') {
        return input
    }

    const response = await getCompanyById(input)
    return response
}

export const kunCompanyGalgameActions = async (
    params: z.infer<typeof getPatchByCompanySchema>
) => {
    const input = safeParseSchema(getPatchByCompanySchema, params)
    if (typeof input === 'string') {
        return input
    }

    const nsfwEnable = await getNSFWHeader()

    const response = await getPatchByCompany(input, nsfwEnable)
    return response
}
