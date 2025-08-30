'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, Button, Select, SelectItem } from '@heroui/react'
import { Plus, Filter } from 'lucide-react'
import { TopicList } from './TopicList'
import { KunPagination } from '~/components/kun/Pagination'
import { kunFetchGet } from '~/utils/kunFetch'

import type { TopicCard } from '~/types/api/topic'
import { useUserStore } from '~/store/userStore'
import toast from 'react-hot-toast'

interface TopicListResponse {
  topics: TopicCard[]
  total: number
  page: number
  limit: number
}

const sortOptions = [
  { key: 'created', label: '最新发布' },
  { key: 'view_count', label: '浏览最多' },
  { key: 'like_count', label: '点赞最多' }
]

const orderOptions = [
  { key: 'desc', label: '降序' },
  { key: 'asc', label: '升序' }
]

export const TopicListPage = () => {
  const { user } = useUserStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [topics, setTopics] = useState<TopicCard[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState('created')
  const [sortOrder, setSortOrder] = useState('desc')
  const limit = 10


  const fetchTopics = async (page: number = 1, sort: string = 'created', order: string = 'desc') => {
    try {
      setLoading(true)
      const response = await kunFetchGet<TopicListResponse>(
        `/api/topic?page=${page}&limit=${limit}&sortField=${sort}&sortOrder=${order}`
      )
      setTopics(response.topics)
      setTotal(response.total)
      setCurrentPage(response.page)
    } catch (error) {
      console.error('获取话题列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateURL = (page: number, sort: string, order: string) => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', page.toString())
    if (sort !== 'created') params.set('sortField', sort)
    if (order !== 'desc') params.set('sortOrder', order)
    
    const newURL = params.toString() ? `/topic?${params.toString()}` : '/topic'
    router.replace(newURL, { scroll: false })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    updateURL(page, sortField, sortOrder)
    fetchTopics(page, sortField, sortOrder)
  }

  const handleSortChange = (field: string, order: string) => {
    setSortField(field)
    setSortOrder(order)
    setCurrentPage(1)
    updateURL(1, field, order)
    fetchTopics(1, field, order)
  }

  useEffect(() => {
    // 从URL参数初始化状态
    const page = parseInt(searchParams.get('page') || '1')
    const sort = searchParams.get('sortField') || 'created'
    const order = searchParams.get('sortOrder') || 'desc'
    
    setCurrentPage(page)
    setSortField(sort)
    setSortOrder(order)
    
    fetchTopics(page, sort, order)
  }, [])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="container mx-auto my-4 space-y-6">

      
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">话题列表</h1>
          <p className="text-sm text-foreground/60 mt-1">
            共 {total} 个话题
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="size-4" />}
          onPress={() => {
            if (!user || user.uid === 0) {
              toast.error('请先登录后发布话题')
              return
            }
            router.push('/topic/create')
          }}
        >
          发布话题
        </Button>
      </div>

      {/* 筛选和排序 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4" />
            <span className="font-medium">筛选和排序</span>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground/70">排序方式:</span>
              <Select
                size="sm"
                selectedKeys={[sortField]}
                onSelectionChange={(keys) => {
                  const field = Array.from(keys)[0] as string
                  handleSortChange(field, sortOrder)
                }}
                className="w-32"
              >
                {sortOptions.map((option) => (
                  <SelectItem key={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground/70">排序:</span>
              <Select
                size="sm"
                selectedKeys={[sortOrder]}
                onSelectionChange={(keys) => {
                  const order = Array.from(keys)[0] as string
                  handleSortChange(sortField, order)
                }}
                className="w-20"
              >
                {orderOptions.map((option) => (
                  <SelectItem key={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 话题列表 */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-lg">加载中...</div>
        </div>
      ) : (
        <TopicList topics={topics} columns={2} />
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <KunPagination
            total={totalPages}
            page={currentPage}
            onPageChange={handlePageChange}
            isLoading={loading}
          />
        </div>
      )}
    </div>
  )
}