'use client'

import { useEffect, useState } from 'react'
import { useDebounce } from 'use-debounce'
import { CompanyHeader } from './CompanyHeader'
import { SearchCompany } from './SearchCompany'
import { CompanyList } from './CompanyList'
import { kunFetchGet, kunFetchPost } from '~/utils/kunFetch'
import { useMounted } from '~/hooks/useMounted'
import { KunPagination } from '~/components/kun/Pagination'
import { KunNull } from '~/components/kun/Null'
import type { Company } from '~/types/api/company'

interface Props {
    initialCompanies: Company[]
    initialTotal: number
    uid?: number
}

export const Container = ({ initialCompanies, initialTotal, uid }: Props) => {
    const [companies, setCompanies] = useState<Company[]>(initialCompanies)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(initialTotal)
    const [loading, setLoading] = useState(false)
    const isMounted = useMounted()

    const fetchCompanies = async () => {
        setLoading(true)
        const { companies, total } = await kunFetchGet<{
            companies: Company[]
            total: number
        }>('/api/company/all', {
            page,
            limit: 100
        })
        setCompanies(companies)
        setTotal(total)
        setLoading(false)
    }

    useEffect(() => {
        if (!isMounted) {
            return
        }
        fetchCompanies()
    }, [page])

    const [query, setQuery] = useState('')
    const [debouncedQuery] = useDebounce(query, 500)
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        if (debouncedQuery) {
            handleSearch()
        } else {
            fetchCompanies()
        }
    }, [debouncedQuery])

    const handleSearch = async () => {
        if (!query.trim()) {
            return
        }

        setSearching(true)
        const response = await kunFetchPost<Company[]>('/api/search/company', {
            query: query.split(' ').filter((term) => term.length > 0)
        })
        setCompanies(response)
        setSearching(false)
    }

    return (
        <div className="flex flex-col w-full my-4 space-y-8">
            <CompanyHeader />

            {uid ? (
                <>
                    <SearchCompany
                        query={query}
                        setQuery={setQuery}
                        handleSearch={handleSearch}
                        searching={searching}
                    />

                    {!searching && (
                        <CompanyList
                            companies={companies}
                            loading={loading}
                            searching={searching}
                        />
                    )}

                    {total > 100 && !query && (
                        <div className="flex justify-center">
                            <KunPagination
                                total={Math.ceil(total / 100)}
                                page={page}
                                onPageChange={setPage}
                                isLoading={loading}
                            />
                        </div>
                    )}
                </>
            ) : (
                <>
                    <KunNull message="请登陆后查看会社列表" />
                </>
            )}
        </div>
    )
}
