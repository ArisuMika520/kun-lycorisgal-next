'use client'

import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
  useDisclosure
} from '@heroui/react'
import { Plus, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import type { AdminTodoItem } from '~/types/api/todo'
import { useUserStore } from '~/store/userStore'
import {
  kunFetchGet,
  kunFetchPost,
  kunFetchPatch
} from '~/utils/kunFetch'
import dayjs from 'dayjs'
import { formatDistanceToNow } from '~/utils/formatDistanceToNow'

interface Props {
  initialTodos: AdminTodoItem[]
}

interface TodoFormState {
  title: string
  description: string
}

const emptyForm: TodoFormState = {
  title: '',
  description: ''
}

export const TodoList = ({ initialTodos }: Props) => {
  const { user } = useUserStore((state) => state)
  const isAdmin = useMemo(() => user.role >= 3, [user.role])

  const [todos, setTodos] = useState<AdminTodoItem[]>(initialTodos)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formState, setFormState] = useState<TodoFormState>(emptyForm)
  const [editingTodo, setEditingTodo] = useState<AdminTodoItem | null>(null)

  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleOpenCreate = () => {
    setEditingTodo(null)
    setFormState(emptyForm)
    onOpen()
  }

  const handleOpenEdit = (todo: AdminTodoItem) => {
    setEditingTodo(todo)
    setFormState({
      title: todo.title,
      description: todo.description ?? ''
    })
    onOpen()
  }

  const closeModal = () => {
    onClose()
    setSubmitting(false)
  }

  const fetchTodos = useCallback(async (showLoader: boolean = true) => {
    if (showLoader) {
      setLoading(true)
    }
    try {
      const response = await kunFetchGet<{ todos: AdminTodoItem[] }>(
        '/api/admin/todo'
      )
      setTodos(response.todos)
    } catch (error) {
      toast.error('获取待办事项失败，请稍后重试')
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const handleSubmit = async () => {
    if (!isAdmin) {
      toast.error('仅管理员可以进行此操作')
      return
    }

    const title = formState.title.trim()
    const description = formState.description.trim()

    if (!title) {
      toast.error('请填写待办标题')
      return
    }

    setSubmitting(true)

    try {
      if (editingTodo) {
        await kunFetchPatch<AdminTodoItem>('/api/admin/todo', {
          id: editingTodo.id,
          title,
          description
        })
        await fetchTodos(false)
        toast.success('更新待办事项成功')
      } else {
        await kunFetchPost<AdminTodoItem>('/api/admin/todo', {
          title,
          description
        })
        await fetchTodos(false)
        toast.success('创建待办事项成功')
      }

      closeModal()
    } catch (error) {
      toast.error('操作失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (todo: AdminTodoItem) => {
    if (!isAdmin) {
      toast.error('仅管理员可以进行此操作')
      return
    }

    const nextStatus = todo.status === 1 ? 0 : 1
    try {
      await kunFetchPatch<AdminTodoItem>('/api/admin/todo', {
        id: todo.id,
        status: nextStatus
      })
      await fetchTodos(false)
      toast.success(nextStatus === 1 ? '已完成该待办' : '已重新开放该待办')
    } catch (error) {
      toast.error('更新待办状态失败，请稍后重试')
    }
  }

  const renderTodoContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-10 text-default-500">
          正在加载待办事项...
        </div>
      )
    }

    if (todos.length === 0) {
      return (
        <Card>
          <CardBody>
            <p className="text-center text-default-500">暂时还没有待办事项。</p>
          </CardBody>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {todos.map((todo) => {
          const isCompleted = todo.status === 1

          return (
            <Card key={todo.id} className={isCompleted ? 'opacity-70' : undefined}>
              <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    isSelected={isCompleted}
                    isDisabled={!isAdmin}
                    onValueChange={() => handleToggleStatus(todo)}
                  />
                  <div>
                    <h2 className="text-lg font-semibold line-clamp-1">{todo.title}</h2>
                    <p className="text-xs text-default-400">
                      创建于 {dayjs(todo.created).format('YYYY-MM-DD HH:mm')}
                    </p>
                    {isCompleted && (
                      <p className="text-xs text-default-400 mt-1">
                        完成时间：{dayjs(todo.updated).format('YYYY-MM-DD - HH:mm')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar
                        size="sm"
                        src={todo.creator?.avatar || undefined}
                        name={todo.creator?.name || '未知'}
                        className="w-6 h-6 text-tiny"
                      />
                      <span className="text-xs text-default-500">
                        负责人：{todo.creator?.name ?? '未设置'}
                      </span>
                    </div>
                  </div>
                  </div>

                {isAdmin && (
                  <Button
                    variant="light"
                    size="sm"
                    startContent={<Pencil size={16} />}
                    onClick={() => handleOpenEdit(todo)}
                  >
                    编辑
                  </Button>
                )}
              </CardHeader>
              {todo.description && (
                <CardBody className="pt-0 text-sm leading-relaxed text-default-600">
                  {todo.description}
                </CardBody>
              )}
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">待办事项</h1>
          <p className="mt-1 text-sm text-default-500">
            展示未来的更新计划与工作安排，普通用户可查看，管理员可维护。
          </p>
        </div>
        {isAdmin && (
          <Button color="primary" startContent={<Plus size={18} />} onClick={handleOpenCreate}>
            新建待办
          </Button>
        )}
      </div>

      {renderTodoContent()}

      <Modal isOpen={isOpen} onClose={closeModal} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {editingTodo ? '编辑待办事项' : '新建待办事项'}
          </ModalHeader>
          <ModalBody>
            <Input
              label="标题"
              placeholder="输入待办事项标题"
              value={formState.title}
              onValueChange={(value) =>
                setFormState((prev) => ({ ...prev, title: value }))
              }
              isRequired
              maxLength={200}
            />
            <Textarea
              label="描述"
              placeholder="补充详细内容 (可选)"
              value={formState.description}
              onValueChange={(value) =>
                setFormState((prev) => ({ ...prev, description: value }))
              }
              maxLength={2000}
              minRows={4}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={closeModal} disabled={submitting}>
              取消
            </Button>
            <Button color="primary" onClick={handleSubmit} isLoading={submitting}>
              确认
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
