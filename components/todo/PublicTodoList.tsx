'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip
} from '@heroui/react'
import { ClipboardList, CheckCircle2, Circle } from 'lucide-react'
import { kunFetchGet } from '~/utils/kunFetch'
import type { AdminTodoItem } from '~/types/api/todo'
import dayjs from 'dayjs'
import { KunPagination } from '~/components/kun/Pagination'

const statusMeta = {
  in_progress: {
    label: '进行中',
    color: 'warning' as const,
    icon: Circle
  },
  completed: {
    label: '已完成',
    color: 'success' as const,
    icon: CheckCircle2
  }
}

const statusOptions = [
  { key: 'all', label: '全部' },
  { key: 'in_progress', label: '进行中' },
  { key: 'completed', label: '已完成' }
] as const

type TodoStatusKey = (typeof statusOptions)[number]['key']

const DEFAULT_PAGE_SIZE = 20

export const PublicTodoList = () => {
  const [todos, setTodos] = useState<AdminTodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<TodoStatusKey>('all')
  const [hasLoaded, setHasLoaded] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const lastParams = useRef<{ status: TodoStatusKey; page: number } | null>(null)

  const updateURL = useCallback(
    (statusKey: TodoStatusKey, pageNumber: number) => {
      const params = new URLSearchParams()
      if (statusKey !== 'all') {
        params.set('status', statusKey)
      }
      if (pageNumber > 1) {
        params.set('page', pageNumber.toString())
      }

      const queryString = params.toString()
      router.replace(queryString ? `/todo?${queryString}` : '/todo', {
        scroll: false
      })
    },
    [router]
  )

  const fetchTodos = useCallback(
    async (statusKey: TodoStatusKey, currentPage: number) => {
      try {
        setLoading(true)
        setError('')

        const response = await kunFetchGet<{
          todos: AdminTodoItem[]
          total?: number
          page?: number
          limit?: number
          status?: string
        }>('/api/admin/todo', {
          status: statusKey,
          page: currentPage,
          limit: DEFAULT_PAGE_SIZE
        })

        setTodos(response.todos)
        setTotal(response.total ?? response.todos.length)
        const resolvedPage = response.page ?? currentPage
        setPage(resolvedPage)
        if (resolvedPage !== currentPage) {
          lastParams.current = { status: statusKey, page: resolvedPage }
          updateURL(statusKey, resolvedPage)
        }
      } catch (err) {
        setError('待办事项获取失败，请稍后再试')
      } finally {
        setLoading(false)
        setHasLoaded(true)
      }
    },
    [updateURL]
  )

  useEffect(() => {
    const statusParam = (searchParams.get('status') as TodoStatusKey) ?? 'all'
    const pageParam = Number(searchParams.get('page') ?? '1')

    const validStatus: TodoStatusKey = statusOptions.some(
      (option) => option.key === statusParam
    )
      ? statusParam
      : 'all'
    const validPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

    if (
      !lastParams.current ||
      lastParams.current.status !== validStatus ||
      lastParams.current.page !== validPage
    ) {
      lastParams.current = { status: validStatus, page: validPage }
      setStatusFilter(validStatus)
      setPage(validPage)
      void fetchTodos(validStatus, validPage)
    }
  }, [fetchTodos, searchParams])

  const handleStatusChange = (statusKey: TodoStatusKey) => {
    if (statusKey === statusFilter) {
      return
    }
    setStatusFilter(statusKey)
    setPage(1)
    updateURL(statusKey, 1)
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    updateURL(statusFilter, nextPage)
  }

  const totalPages = total > 0 ? Math.ceil(total / DEFAULT_PAGE_SIZE) : 1

  const renderFilter = () => (
    <div className="flex flex-wrap gap-2">
      {statusOptions.map((option) => (
        <Button
          key={option.key}
          size="sm"
          variant={statusFilter === option.key ? 'solid' : 'flat'}
          color={statusFilter === option.key ? 'primary' : 'default'}
          onPress={() => handleStatusChange(option.key)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )

  const showInitialLoading = loading && !hasLoaded

  if (showInitialLoading) {
    return (
      <div className="container mx-auto my-6 space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="size-6" />
          <div>
            <h1 className="text-2xl font-bold">待办事项</h1>
            <p className="text-sm text-default-500 mt-1">正在加载最新的站点计划...</p>
          </div>
        </div>
        <Card>
          <CardBody className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="animate-pulse space-y-3">
                <div className="h-4 bg-default-200/60 rounded-md" />
                <div className="h-3 bg-default-200/40 rounded-md" />
                <div className="h-3 bg-default-200/30 rounded-md w-1/2" />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto my-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="size-6" />
          <div>
            <h1 className="text-2xl font-bold">待办事项</h1>
            <p className="text-sm text-default-500 mt-1">
              共 {total} 条任务 · 每页最多 {DEFAULT_PAGE_SIZE} 条
            </p>
            {error && (
              <p className="text-sm text-danger mt-1">{error}</p>
            )}
          </div>
        </div>
        {renderFilter()}
      </div>

      {todos.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-center text-default-500">
              {statusFilter === 'completed'
                ? '还没有已经完成的待办事项。'
                : statusFilter === 'in_progress'
                  ? '当前没有进行中的待办事项。'
                  : '暂无待办事项，欢迎继续关注站点更新动态。'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {todos.map((todo, index) => {
            const isCompleted = todo.status === 1
            const status = isCompleted
              ? statusMeta.completed
              : statusMeta.in_progress
            const StatusIcon = status.icon

            return (
              <Card key={todo.id} className="shadow-sm">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-default-400">
                      <span>NO.{(page - 1) * DEFAULT_PAGE_SIZE + index + 1}</span>
                      <span>创建于 {dayjs(todo.created).format('YYYY-MM-DD HH:mm')}</span>
                      {isCompleted && (
                        <span>
                          完成于 {dayjs(todo.updated).format('YYYY-MM-DD - HH:mm')}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-foreground line-clamp-2">
                      {todo.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-default-500">
                      <Avatar
                        size="sm"
                        src={todo.creator?.avatar || undefined}
                        name={todo.creator?.name || '未知'}
                        className="w-6 h-6 text-tiny"
                      />
                      <span>负责人：{todo.creator?.name ?? '未设置'}</span>
                    </div>
                  </div>
                  <Chip
                    color={status.color}
                    variant="flat"
                    startContent={<StatusIcon className="size-4" />}
                    className="self-start"
                  >
                    {isCompleted
                      ? `${status.label} · ${dayjs(todo.updated).format('YYYY-MM-DD - HH:mm')}`
                      : status.label}
                  </Chip>
                </CardHeader>
                {todo.description?.trim() && (
                  <CardBody className="pt-0 text-sm leading-relaxed text-default-600 whitespace-pre-line">
                    {todo.description}
                  </CardBody>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {total > DEFAULT_PAGE_SIZE && (
        <div className="flex justify-center">
          <KunPagination
            total={totalPages}
            page={page}
            onPageChange={handlePageChange}
            isLoading={loading}
          />
        </div>
      )}
    </div>
  )
}
