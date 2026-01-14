'use client'

import { useEffect, useState } from 'react'
import { kunFetchGet } from '~/utils/kunFetch'
import { Chip } from '@heroui/chip'
import { Button } from '@heroui/button'
import { useDisclosure } from '@heroui/modal'
import { Pencil } from 'lucide-react'
import { CompanyDetail } from '~/types/api/company'
import { KunLoading } from '~/components/kun/Loading'
import { KunHeader } from '~/components/kun/Header'
import { useMounted } from '~/hooks/useMounted'
import { GalgameCard } from '~/components/galgame/Card'
import { KunNull } from '~/components/kun/Null'
import { EditCompanyModal } from './EditCompanyModal'
import { useRouter } from '@bprogress/next'
import { KunUser } from '~/components/kun/floating-card/KunUser'
import { formatDistanceToNow } from '~/utils/formatDistanceToNow'
import { useUserStore } from '~/store/userStore'
import { useSearchParams } from 'next/navigation'
import { FilterBar } from './FilterBar'
import { KunPagination } from '~/components/kun/Pagination'
import type { SortField } from './_sort'

interface Props {
    initialCompany: CompanyDetail
    initialPatches: GalgameCard[]
    total: number
}

export const CompanyDetailContainer = ({
    initialCompany,
    initialPatches,
    total
}: Props) => {
    const isMounted = useMounted()
    const user = useUserStore((state) => state.user)
    const router = useRouter()
    const searchParams = useSearchParams()
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
    const [sortField, setSortField] = useState<SortField>(
        (searchParams.get('sortField') as SortField) || 'resource_update_time'
    )

    const [company, setCompany] = useState(initialCompany)
    const [patches, setPatches] = useState<GalgameCard[]>(initialPatches)
    const [loading, setLoading] = useState(false)
    const { isOpen, onOpen, onClose } = useDisclosure()

    const fetchPatches = async () => {
        setLoading(true)

        const { galgames } = await kunFetchGet<{
            galgames: GalgameCard[]
            total: number
        }>('/api/company/galgame', {
            companyId: company.id,
            page,
            limit: 24,
            sortField
        })

        setPatches(galgames)
        setLoading(false)
    }

    useEffect(() => {
        if (!isMounted) {
            return
        }
        fetchPatches()
    }, [page])

    useEffect(() => {
        if (!isMounted) {
            return
        }

        const params = new URLSearchParams()
        params.set('sortField', sortField)

        const queryString = params.toString()
        const url = queryString ? `?${queryString}` : ''
        router.push(url)

        fetchPatches()
    }, [sortField])

    return (
        <div className="w-full my-4 space-y-6">
            <KunHeader
                name={company.name}
                description={company.introduction}
                headerEndContent={
                    <Chip size="lg" color="primary">
                        {company.count} 个 Galgame
                    </Chip>
                }
                endContent={
                    <div className="flex justify-between">
                        <KunUser
                            user={company.user}
                            userProps={{
                                name: company.user.name,
                                description: `创建于 ${formatDistanceToNow(company.created)}`,
                                avatarProps: {
                                    src: company.user?.avatar
                                }
                            }}
                        />

                        <div className="flex items-center gap-2">
                            {/* <DeleteCompanyModal company={company} /> */}

                            {user.role > 2 && (
                                <Button
                                    variant="flat"
                                    color="primary"
                                    onPress={onOpen}
                                    startContent={<Pencil />}
                                >
                                    编辑该会社
                                </Button>
                            )}
                            <EditCompanyModal
                                company={company}
                                isOpen={isOpen}
                                onClose={onClose}
                                onSuccess={(newCompany) => {
                                    setCompany(newCompany)
                                    onClose()
                                }}
                            />
                        </div>
                    </div>
                }
            />

            <FilterBar sortField={sortField} setSortField={setSortField} />

            {company.alias.length > 0 && (
                <div>
                    <h2 className="mb-4 text-lg font-semibold">别名</h2>
                    <div className="flex flex-wrap gap-2">
                        {company.alias.map((alias, index) => (
                            <Chip key={index} variant="flat" color="warning">
                                {alias}
                            </Chip>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <KunLoading hint="正在获取 Galgame 中..." />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4 xl:grid-cols-6">
                        {patches.map((pa) => (
                            <GalgameCard key={pa.id} patch={pa} />
                        ))}
                    </div>

                    {total > 24 && (
                        <div className="flex justify-center">
                            <KunPagination
                                total={Math.ceil(total / 24)}
                                page={page}
                                onPageChange={setPage}
                                isLoading={loading}
                            />
                        </div>
                    )}

                    {!total && <KunNull message="该会社暂无 Galgame" />}
                </>
            )}
        </div>
    )
}
