'use client'

import { useEffect, useState } from 'react'
import { kunFetchGet } from '~/utils/kunFetch'
import { GalgameCard } from './Card'
import { FilterBar } from './FilterBar'
import { useMounted } from '~/hooks/useMounted'
import { KunHeader } from '../kun/Header'
import { KunPagination } from '../kun/Pagination'
import { useRouter, useSearchParams } from 'next/navigation'
import type { SortField, SortOrder } from './_sort'

interface Props {
  initialGalgames: GalgameCard[]
  initialTotal: number
}

export const CardContainer = ({ initialGalgames, initialTotal }: Props) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMounted = useMounted()

  const [galgames, setGalgames] = useState<GalgameCard[]>(initialGalgames)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>(
    searchParams.get('type') || 'all'
  )
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    searchParams.get('language') || 'all'
  )
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    searchParams.get('platform') || 'all'
  )
  const [sortField, setSortField] = useState<SortField>(
    (searchParams.get('sortField') as SortField) || 'resource_update_time'
  )
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get('sortOrder') as SortOrder) || 'desc'
  )
  const [selectedYears, setSelectedYears] = useState<string[]>(
    JSON.parse(searchParams.get('selectedYears') as string) || ['all']
  )
  const [selectedMonths, setSelectedMonths] = useState<string[]>(
    JSON.parse(searchParams.get('selectedMonths') as string) || ['all']
  )
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)

  const fetchPatches = async () => {
    setLoading(true)

    try {
      const { galgames, total } = await kunFetchGet<{
        galgames: GalgameCard[]
        total: number
      }>('/api/galgame', {
        selectedType,
        selectedLanguage,
        selectedPlatform,
        sortField,
        sortOrder,
        page,
        limit: 24,
        yearString: JSON.stringify(selectedYears),
        monthString: JSON.stringify(selectedMonths)
      })

      setGalgames(galgames)
      setTotal(total)
    } catch (error) {
      console.error('Failed to fetch galgames:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateURLAndFetch = async () => {
    if (!isMounted) {
      return
    }

    // 更新URL
    const params = new URLSearchParams()
    params.set('type', selectedType)
    params.set('language', selectedLanguage)
    params.set('platform', selectedPlatform)
    params.set('sortField', sortField)
    params.set('sortOrder', sortOrder)
    params.set('selectedYears', JSON.stringify(selectedYears))
    params.set('selectedMonths', JSON.stringify(selectedMonths))
    params.set('page', page.toString())

    const queryString = params.toString()
    const url = queryString ? `?${queryString}` : ''
    router.push(url, { scroll: false })

    // 获取数据
    await fetchPatches()
  }

  // 当筛选条件改变时，重置页码为1
  useEffect(() => {
    if (isMounted && page !== 1) {
      setPage(1)
    }
  }, [
    sortField,
    sortOrder,
    selectedType,
    selectedLanguage,
    selectedPlatform,
    selectedYears,
    selectedMonths,
    isMounted
  ])

  // 当页码或筛选条件改变时，更新URL和获取数据
  useEffect(() => {
    updateURLAndFetch()
  }, [
    sortField,
    sortOrder,
    selectedType,
    selectedLanguage,
    selectedPlatform,
    page,
    selectedYears,
    selectedMonths,
    isMounted
  ])

  return (
    <div className="container mx-auto my-4 space-y-6">
      <KunHeader
        name="Galgame"
        description="这里展示了本站所有的 Galgame, 您可以点击进入以下载 Galgame 资源"
      />

      <FilterBar
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        sortField={sortField}
        setSortField={setSortField}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        selectedPlatform={selectedPlatform}
        setSelectedPlatform={setSelectedPlatform}
        selectedYears={selectedYears}
        setSelectedYears={setSelectedYears}
        selectedMonths={selectedMonths}
        setSelectedMonths={setSelectedMonths}
      />

      <div className="grid grid-cols-3 gap-4 mx-auto mb-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-5">
        {galgames.map((pa) => (
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
    </div>
  )
}
