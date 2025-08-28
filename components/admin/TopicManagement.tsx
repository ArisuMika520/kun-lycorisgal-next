'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Chip, Pagination, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react'
import { kunFetchGet } from '~/utils/kunFetch'
import { Trash2 } from 'lucide-react'

interface TopicData {
  id: number
  title: string
  content: string
  status: number
  is_pinned: boolean
  view_count: number
  like_count: number
  created: string
  updated: string
  user: {
    id: number
    name: string
    avatar: string
  }
}

interface TopicListResponse {
  topics: TopicData[]
  total: number
  page: number
  limit: number
}

export const TopicManagement = () => {
  const [topics, setTopics] = useState<TopicData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [updating, setUpdating] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; topic: TopicData | null }>({ show: false, topic: null })
  const limit = 10

  const fetchTopics = async (page: number = 1) => {
    try {
      setLoading(true)
      const response = await kunFetchGet<TopicListResponse>(
        `/api/admin/topic/list?page=${page}&limit=${limit}`
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

  const togglePin = async (topicId: number, currentPinned: boolean) => {
    try {
      setUpdating(topicId)
      const response = await fetch('/api/admin/topic', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: topicId,
          is_pinned: !currentPinned
        })
      })
      
      if (!response.ok) {
        throw new Error('更新失败')
      }
      
      // 更新本地状态
      setTopics(prev => prev.map(topic => 
        topic.id === topicId 
          ? { ...topic, is_pinned: !currentPinned }
          : topic
      ))
    } catch (error) {
      console.error('更新置顶状态失败:', error)
    } finally {
      setUpdating(null)
    }
  }

  const handleDeleteConfirm = (topic: TopicData) => {
    setDeleteConfirm({ show: true, topic })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, topic: null })
  }

  const handleDelete = async () => {
    if (!deleteConfirm.topic || deleting) return
    
    const topicId = deleteConfirm.topic.id
    setDeleting(topicId)
    
    try {
      const response = await fetch(`/api/topic/${topicId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('删除失败')
      }
      
      // 从列表中移除已删除的话题
      setTopics(prev => prev.filter(topic => topic.id !== topicId))
      setTotal(prev => prev - 1)
      
      // 如果当前页没有话题了，且不是第一页，则跳转到上一页
      if (topics.length === 1 && currentPage > 1) {
        const newPage = currentPage - 1
        setCurrentPage(newPage)
        fetchTopics(newPage)
      }
    } catch (error) {
      console.error('删除话题失败:', error)
      alert('删除话题失败，请重试')
    } finally {
      setDeleting(null)
      setDeleteConfirm({ show: false, topic: null })
    }
  }

  useEffect(() => {
    fetchTopics()
  }, [])

  const totalPages = Math.ceil(total / limit)

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">话题管理</h1>
        <p className="text-gray-600">管理所有话题的置顶状态</p>
      </div>

      <div className="space-y-4">
        {topics.map((topic) => (
          <Card key={topic.id} className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{topic.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>作者: {topic.user.name}</span>
                    <span>•</span>
                    <span>浏览: {topic.view_count}</span>
                    <span>•</span>
                    <span>点赞: {topic.like_count}</span>
                    <span>•</span>
                    <span>
                      {new Date(topic.created).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {topic.is_pinned && (
                  <Chip color="warning" variant="flat" size="sm">
                    已置顶
                  </Chip>
                )}
                <Button
                  color={topic.is_pinned ? "default" : "primary"}
                  variant={topic.is_pinned ? "flat" : "solid"}
                  size="sm"
                  isLoading={updating === topic.id}
                  onPress={() => togglePin(topic.id, topic.is_pinned)}
                >
                  {topic.is_pinned ? '取消置顶' : '置顶'}
                </Button>
                <Button
                  color="danger"
                  variant="bordered"
                  size="sm"
                  startContent={<Trash2 className="w-4 h-4" />}
                  onPress={() => handleDeleteConfirm(topic)}
                >
                  删除
                </Button>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <p className="text-gray-600 line-clamp-2">
                {topic.content.substring(0, 200)}...
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={(page) => {
              setCurrentPage(page)
              fetchTopics(page)
            }}
            showControls
            showShadow
          />
        </div>
      )}

      {topics.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无话题</p>
        </div>
      )}
      
      {/* 删除确认对话框 */}
      <Modal 
        isOpen={deleteConfirm.show} 
        onClose={handleDeleteCancel}
        placement="center"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            确认删除话题
          </ModalHeader>
          <ModalBody>
            <p>您确定要删除话题「{deleteConfirm.topic?.title}」吗？</p>
            <p className="text-sm text-foreground/60">此操作不可撤销，话题删除后将无法恢复。</p>
          </ModalBody>
          <ModalFooter>
            <Button 
              color="default" 
              variant="light" 
              onPress={handleDeleteCancel}
            >
              取消
            </Button>
            <Button 
              color="danger" 
              onPress={handleDelete}
              isLoading={deleting === deleteConfirm.topic?.id}
            >
              确认删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}