import { Suspense } from 'react'
import { CompanyDetailContainer } from '~/components/company/detail/Container'
import { generateKunMetadataTemplate } from './metadata'
import { kunGetCompanyByIdActions, kunCompanyGalgameActions } from './actions'
import { ErrorComponent } from '~/components/error/ErrorComponent'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'
import { KunNull } from '~/components/kun/Null'
import type { SortField } from '~/components/company/detail/_sort'

export const revalidate = 3

interface Props {
    params: Promise<{ id: string }>
    searchParams?: Promise<{ page?: number; sortField: SortField }>
}

export const generateMetadata = generateKunMetadataTemplate()

export default async function Kun({ params, searchParams }: Props) {
    const { id } = await params
    const res = await searchParams
    const sortField = res?.sortField ? res.sortField : 'created'
    const currentPage = res?.page ? res.page : 1

    const company = await kunGetCompanyByIdActions({ companyId: Number(id) })
    if (typeof company === 'string') {
        return <ErrorComponent error={company} />
    }

    const response = await kunCompanyGalgameActions({
        companyId: Number(id),
        page: currentPage,
        limit: 24,
        sortField
    })
    if (typeof response === 'string') {
        return <ErrorComponent error={response} />
    }

    const payload = await verifyHeaderCookie()

    return (
        <Suspense>
            {payload?.uid ? (
                <CompanyDetailContainer
                    initialCompany={company}
                    initialPatches={response.galgames}
                    total={response.total}
                />
            ) : (
                <KunNull message="请登录后查看会社详细信息" />
            )}
        </Suspense>
    )
}
