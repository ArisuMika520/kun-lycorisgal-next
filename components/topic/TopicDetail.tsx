'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody, Button, Avatar, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react'
import { formatDistanceToNow } from '~/utils/formatDistanceToNow'
import type { Topic } from '~/types/api/topic'
import { Heart, Eye, Pin, PinOff, Edit, Trash2 } from 'lucide-react'
import { MarkdownRenderer } from '~/components/kun/MarkdownRenderer'
import { TopicCommentContainer } from '~/components/comment/TopicCommentContainer'
import { EditTopic } from './EditTopic'
import { useUserStore } from '~/store/userStore'
import toast from 'react-hot-toast'

interface Props {
  topic: Topic
}

export const TopicDetail = ({ topic: initialTopic }: Props) => {
  const { user } = useUserStore()
  const [topic, setTopic] = useState(initialTopic)
  const [isLiking, setIsLiking] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 当初始话题更新时，同步本地状态
  useEffect(() => {
    setTopic(initialTopic)
  }, [initialTopic])

  const handleLike = async () => {
    if (!user) {
      toast.error('请先登录后点赞')
      return
    }
    
    if (isLiking) return
    
    setIsLiking(true)
    try {
      const response = await fetch('/api/topic/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: topic.id
        })
      })
      
      if (!response.ok) {
        throw new Error(`点赞失败: ${response.status}`)
      }
      
      const result = await response.json()
      
      setTopic(prev => ({
        ...prev,
        isLiked: result.liked,
        like_count: result.liked ? prev.like_count + 1 : prev.like_count - 1
      }))
    } catch (error) {
      console.error('点赞失败:', error)
      toast.error('请登录后再点赞')
    } finally {
      setIsLiking(false)
    }
  }

  const handlePin = async () => {
    if (isPinning) return
    
    setIsPinning(true)
    try {
      const response = await fetch('/api/admin/topic', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: topic.id,
          is_pinned: !topic.is_pinned
        })
      })
      
      if (!response.ok) {
        throw new Error(`置顶操作失败: ${response.status}`)
      }
      
      setTopic(prev => ({
        ...prev,
        is_pinned: !prev.is_pinned
      }))
    } catch (error) {
      console.error('置顶操作失败:', error)
    } finally {
      setIsPinning(false)
    }
  }

  const handleEditSuccess = (updatedTopic: Topic) => {
    setTopic(updatedTopic)
    setIsEditing(false)
  }

  const handleEditCancel = () => {
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (isDeleting) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/topic/${topic.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error(`删除失败: ${response.status}`)
      }
      
      // 删除成功后跳转到话题列表页面
      window.location.href = '/topic'
    } catch (error) {
      console.error('删除话题失败:', error)
      alert('删除话题失败，请重试')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  // 如果正在编辑，显示编辑表单
  if (isEditing) {
    return (
      <EditTopic 
        topic={topic}
        onCancel={handleEditCancel}
        onSuccess={handleEditSuccess}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="w-full">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-2">
              {topic.is_pinned && (
                <Chip
                  startContent={<Pin className="w-4 h-4" />}
                  color="warning"
                  variant="flat"
                  size="sm"
                >
                  置顶
                </Chip>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">{topic.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-foreground/60">
              <div className="flex items-center gap-2">
                <Avatar
                  src={topic.user.avatar && topic.user.avatar.trim() !== '' ? topic.user.avatar : undefined}
                  name={topic.user.name}
                  size="sm"
                  showFallback
                />
                <span>{topic.user.name}</span>
              </div>
              <span>发布于 {formatDistanceToNow(topic.created)}</span>
              {topic.updated !== topic.created && (
                <span>编辑于 {formatDistanceToNow(topic.updated)}</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <MarkdownRenderer 
            content={topic.content}
            className="whitespace-pre-wrap"
          />
          
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-divider">
            <div className="flex items-center gap-4 text-sm text-foreground/60">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{topic.view_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className={`w-4 h-4 ${topic.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{topic.like_count}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                color={topic.isLiked ? "danger" : "default"}
                variant={topic.isLiked ? "flat" : "bordered"}
                startContent={
                  <Heart className={`w-4 h-4 ${topic.isLiked ? 'fill-current' : ''}`} />
                }
                onPress={handleLike}
                isLoading={isLiking}
                size="sm"
              >
                {topic.isLiked ? '取消点赞' : '点赞'}
              </Button>
              
              {/* 话题作者编辑按钮 */}
              {user && user.uid === topic.user.id && (
                <Button
                  color="primary"
                  variant="bordered"
                  startContent={<Edit className="w-4 h-4" />}
                  onPress={() => setIsEditing(true)}
                  size="sm"
                >
                  编辑
                </Button>
              )}
              
              {/* 管理员置顶按钮 */}
              {user && user.role >= 3 && (
                <Button
                  color={topic.is_pinned ? "warning" : "default"}
                  variant={topic.is_pinned ? "flat" : "bordered"}
                  startContent={
                    topic.is_pinned ? 
                      <PinOff className="w-4 h-4" /> : 
                      <Pin className="w-4 h-4" />
                  }
                  onPress={handlePin}
                  isLoading={isPinning}
                  size="sm"
                >
                  {topic.is_pinned ? '取消置顶' : '置顶'}
                </Button>
              )}
              
              {/* 管理员删除按钮 */}
              {user && user.role >= 2 && (
                <Button
                  color="danger"
                  variant="bordered"
                  startContent={<Trash2 className="w-4 h-4" />}
                  onPress={handleDeleteConfirm}
                  size="sm"
                >
                  删除
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
      
      {/* 评论区域 */}
      <TopicCommentContainer topicId={topic.id} />
      
      {/* 删除确认对话框 */}
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={handleDeleteCancel}
        placement="center"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            确认删除话题
          </ModalHeader>
          <ModalBody>
            <p>您确定要删除话题「{topic.title}」吗？</p>
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
              isLoading={isDeleting}
            >
              确认删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}