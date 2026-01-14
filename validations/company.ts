import { z } from 'zod'

export const createCompanySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, { message: '会社名不可为空' })
        .max(50, { message: '会社名最大 50 个字符' }),
    introduction: z
        .string()
        .trim()
        .max(10007, { message: '会社的介绍最大 10007 个字符' })
        .optional(),
    alias: z.array(
        z
            .string()
            .trim()
            .min(1, { message: '别名不可为空' })
            .max(50, { message: '单个会社的别名最大 50 个字符' })
    )
})

export const updateCompanySchema = createCompanySchema.merge(
    z.object({
        companyId: z.coerce.number().min(1).max(9999999)
    })
)

export const getCompanySchema = z.object({
    page: z.coerce.number().min(1).max(9999999),
    limit: z.coerce.number().min(1).max(100)
})

export const getCompanyByIdSchema = z.object({
    companyId: z.coerce.number().min(1).max(9999999)
})

export const getPatchByCompanySchema = z.object({
    companyId: z.coerce.number().min(1).max(9999999),
    page: z.coerce.number().min(1).max(9999999),
    limit: z.coerce.number().min(1).max(24),
    sortField: z.union([
        z.literal('resource_update_time'),
        z.literal('created'),
        z.literal('view'),
        z.literal('download')
    ])
})
