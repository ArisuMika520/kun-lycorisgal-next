'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Avatar, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from '@heroui/modal'
import { Textarea } from '@heroui/input'
import { MessageCircle, Send, Heart, Reply, Edit, Trash2, Flag } from 'lucide-react'
import { KunEditor } from '~/components/kun/milkdown/Editor'
import { MarkdownRenderer } from '~/components/kun/MarkdownRenderer'
import { formatDistanceToNow } from '~/utils/formatDistanceToNow'
import { KunUser } from '~/components/kun/floating-card/KunUser'
import { useUserStore } from '~/store/userStore'
import toast from 'react-hot-toast'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import { kunFetchGet, kunFetchPost, kunFetchPut, kunFetchDelete } from '~/utils/kunFetch'

interface Comment {
  id: number
  content: string
  user: {
    id: number
    name: string
    avatar: string
  }
  parent_id: number | null
  like_count: number
  isLiked: boolean
  created: string
  updated: string
  replies?: Comment[]
}

interface Props {
  topicId: number
}

export const TopicCommentList = ({ topicId }: Props) => {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingComment, setEditingComment] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [reportContent, setReportContent] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [likingComments, setLikingComments] = useState<Set<number>>(new Set())
  
  const { user } = useUserStore((state) => state)
  
  // 编辑弹窗
  const {
    isOpen: isOpenEdit,
    onOpen: onOpenEdit,
    onClose: onCloseEdit
  } = useDisclosure()
  
  // 删除弹窗
  const {
    isOpen: isOpenDelete,
    onOpen: onOpenDelete,
    onClose: onCloseDelete
  } = useDisclosure()
  
  // 举报弹窗
  const {
    isOpen: isOpenReport,
    onOpen: onOpenReport,
    onClose: onCloseReport
  } = useDisclosure()
  
  const [currentCommentId, setCurrentCommentId] = useState<number | null>(null)

  const saveCommentMarkdown = (markdown: string) => {
    setNewComment(markdown)
  }

  const saveReplyMarkdown = (markdown: string) => {
    setReplyContent(markdown)
  }

  // 获取评论列表
  const fetchComments = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      
      // 尝试从API获取评论
      try {
        const response = await fetch(`/api/topic/comment?topicId=${topicId}`)
        if (response.ok) {
          const data = await response.json()
          setComments(data.comments || [])
          return
        }
      } catch (apiError) {
        console.log('API获取评论失败，使用模拟数据:', apiError)
      }
      
      // 如果API失败，使用模拟数据
      const mockComments: Comment[] = [
        {
          id: 1,
          content: '这是一个测试评论，支持 **Markdown** 格式！',
          user: {
            id: 1,
            name: 'Test User',
            avatar: ''
          },
          parent_id: null,
          like_count: 5,
          isLiked: false,
          created: new Date(Date.now() - 3600000).toISOString(),
          updated: new Date(Date.now() - 3600000).toISOString(),
          replies: [
            {
              id: 2,
              content: '这是一个回复评论',
              user: {
                id: 2,
                name: 'Reply User',
                avatar: ''
              },
              parent_id: 1,
              like_count: 2,
              isLiked: true,
              created: new Date(Date.now() - 1800000).toISOString(),
              updated: new Date(Date.now() - 1800000).toISOString()
            }
          ]
        }
      ]
      setComments(mockComments)
    } catch (error) {
      console.error('获取评论失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 点赞评论
  const handleLikeComment = async (commentId: number) => {
    if (likingComments.has(commentId)) return
    
    setLikingComments(prev => new Set(prev).add(commentId))
    try {
      const response = await fetch('/api/topic/comment/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentId })
      })

      if (response.ok) {
        const result = await response.json()
        // 实时更新评论的点赞状态和数量
        setComments(prev => 
          prev.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                isLiked: result.liked,
                like_count: result.liked ? comment.like_count + 1 : comment.like_count - 1
              }
            }
            // 同时更新回复中的点赞状态
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map(reply => 
                  reply.id === commentId 
                    ? {
                        ...reply,
                        isLiked: result.liked,
                        like_count: result.liked ? reply.like_count + 1 : reply.like_count - 1
                      }
                    : reply
                )
              }
            }
            return comment
          })
        )
        toast.success(result.liked ? '点赞成功' : '取消点赞成功')
      } else {
        const error = await response.json()
        toast.error(error.message || '操作失败')
      }
    } catch (error) {
      console.error('点赞失败:', error)
      toast.error('网络错误，请稍后重试')
    } finally {
      setLikingComments(prev => {
        const newSet = new Set(prev)
        newSet.delete(commentId)
        return newSet
      })
    }
  }

  // 提交回复
  const handleSubmitReply = async (parentId: number) => {
    if (!replyContent.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/topic/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId,
          content: replyContent,
          parentId
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('回复发表成功:', result)
        setReplyContent('')
        setReplyingTo(null)
        fetchComments(false) // 刷新评论列表，不显示loading
      } else {
        const error = await response.json()
        console.error('发表回复失败:', error.message)
      }
    } catch (error) {
      console.error('发表回复失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartEdit = async (commentId: number) => {
    try {
      // 这里应该调用API获取评论的markdown内容
      // const res = await kunFetchGet<KunResponse<{ content: string }>>('/api/topic/comment/markdown', { commentId })
      const comment = comments.find(c => c.id === commentId)
      if (comment) {
        setCurrentCommentId(commentId)
        setEditContent(comment.content)
        onOpenEdit()
      }
    } catch (error) {
      toast.error('获取评论内容失败')
    }
  }

  const handleUpdateComment = async () => {
    if (!editContent.trim() || !currentCommentId) {
      toast.error('评论内容不可为空')
      return
    }

    setUpdating(true)
    try {
      // 这里应该调用API更新评论
      // const res = await kunFetchPut<KunResponse<Comment>>('/api/topic/comment', {
      //   commentId: currentCommentId,
      //   content: editContent.trim()
      // })
      
      // 模拟更新成功
      setComments(prev =>
        prev.map(comment =>
          comment.id === currentCommentId
            ? { ...comment, content: editContent }
            : comment
        )
      )
      setEditContent('')
      setCurrentCommentId(null)
      onCloseEdit()
      toast.success('更新评论成功!')
    } catch (error) {
      toast.error('更新评论失败')
    }
    setUpdating(false)
  }

  const handleDeleteComment = async () => {
    if (!currentCommentId) return
    
    setDeleting(true)
    try {
      // 这里应该调用API删除评论
      // const res = await kunFetchDelete<KunResponse<{}>>('/api/topic/comment', {
      //   commentId: currentCommentId
      // })
      
      // 模拟删除成功
      setComments(prev => prev.filter(com => com.id !== currentCommentId))
      setCurrentCommentId(null)
      onCloseDelete()
      toast.success('评论删除成功')
    } catch (error) {
      toast.error('删除评论失败')
    }
    setDeleting(false)
  }

  const handleSubmitReport = async () => {
    if (!reportContent.trim() || !currentCommentId) {
      toast.error('请填写举报原因')
      return
    }
    
    setReporting(true)
    try {
      await kunFetchPost('/api/topic/comment/report', {
        commentId: currentCommentId,
        topicId,
        content: reportContent
      })
      
      setReportContent('')
      setCurrentCommentId(null)
      onCloseReport()
      toast.success('提交举报成功')
    } catch (error) {
      toast.error('提交举报失败')
    }
    setReporting(false)
  }

  const saveEditMarkdown = (markdown: string) => {
    setEditContent(markdown)
  }

  useEffect(() => {
    fetchComments()
  }, [topicId])

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/topic/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId,
          content: newComment
        })
      })

      if (response.ok) {
         const result = await response.json()
         console.log('评论发表成功:', result)
         setNewComment('') // 清空输入框
         toast.success('评论发表成功!')
         fetchComments(false) // 刷新评论列表，不显示loading
       } else {
        const error = await response.json()
        console.error('发表评论失败:', error.message)
        toast.error(error.message || '发表评论失败')
      }
    } catch (error) {
      console.error('发表评论失败:', error)
      toast.error('发表评论失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 渲染单个评论
  const renderComment = (comment: Comment, isReply = false) => (
    <Card key={comment.id} className={`w-full ${isReply ? 'ml-8 mt-3' : ''}`}>
      <CardBody className="p-3">
        <div className="space-y-2">
          {/* 用户信息行 */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <KunUser
                user={{
                  id: comment.user.id,
                  name: comment.user.name,
                  avatar: comment.user.avatar
                }}
                userProps={{
                  name: comment.user.name,
                  avatarProps: {
                    src: comment.user.avatar && comment.user.avatar.trim() !== '' ? comment.user.avatar : undefined,
                    name: comment.user.name,
                    size: "sm",
                    className: "w-10 h-10"
                  }
                }}
              />
              <span className="text-tiny text-foreground-400">
                {formatDistanceToNow(new Date(comment.created))}
              </span>
            </div>
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="text-default-400 min-w-10 w-10 h-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ellipsis size-4">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Comment actions"
                disabledKeys={
                  user?.uid !== comment.user.id && user?.role < 3
                    ? ['edit', 'delete']
                    : ['report']
                }
              >
                <DropdownItem
                  key="edit"
                  color="default"
                  startContent={<Edit className="size-4" />}
                  onPress={() => handleStartEdit(comment.id)}
                >
                  编辑评论
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 className="size-4" />}
                  onPress={() => {
                    setCurrentCommentId(comment.id)
                    onOpenDelete()
                  }}
                >
                  删除评论
                </DropdownItem>
                <DropdownItem
                  key="report"
                  startContent={<Flag className="size-4" />}
                  onPress={() => {
                    setCurrentCommentId(comment.id)
                    onOpenReport()
                  }}
                >
                  举报评论
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
          
          {/* 评论内容 */}
          {editingComment === comment.id ? (
            <div className="space-y-3">
              <div className="min-h-[150px] border border-gray-200 rounded-lg">
                <KunEditor
                  valueMarkdown={editContent}
                  saveMarkdown={saveEditMarkdown}
                  placeholder="编辑你的评论..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => {
                    setEditingComment(null)
                    setEditContent('')
                  }}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  onPress={handleUpdateComment}
                  isDisabled={!editContent.trim() || updating}
                  isLoading={updating}
                >
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div className="kun-prose max-w-none">
              <MarkdownRenderer content={comment.content} />
            </div>
          )}
          
          {/* 操作按钮 */}
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="bordered"
              color={comment.isLiked ? "danger" : "default"}
              startContent={<Heart className={`w-4 h-4 ${comment.isLiked ? 'fill-current' : ''}`} />}
              onPress={() => handleLikeComment(comment.id)}
              isLoading={likingComments.has(comment.id)}
              isDisabled={likingComments.has(comment.id)}
              className="min-w-16 h-8 text-tiny"
            >
              {comment.like_count}
            </Button>
            
            {!isReply && (
              <Button
                size="sm"
                variant="bordered"
                startContent={<Reply className="w-4 h-4" />}
                onPress={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="min-w-16 h-8 text-tiny"
              >
                回复
              </Button>
            )}
          </div>
          
          {/* 回复输入框 */}
          {replyingTo === comment.id && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <div className="min-h-[150px] border border-gray-200 rounded-lg">
                <KunEditor
                  valueMarkdown={replyContent}
                  saveMarkdown={saveReplyMarkdown}
                  placeholder="写下你的回复..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => {
                    setReplyingTo(null)
                    setReplyContent('')
                  }}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  startContent={<Send className="w-4 h-4" />}
                  onPress={() => handleSubmitReply(comment.id)}
                  isLoading={isSubmitting}
                  isDisabled={!replyContent.trim()}
                >
                  发表回复
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* 新增评论 */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="text-lg font-semibold">发表评论</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-3">
            <div className="min-h-[200px] border border-gray-200 rounded-lg">
              <KunEditor
                valueMarkdown={newComment}
                saveMarkdown={saveCommentMarkdown}
                placeholder="写下你的评论..."
              />
            </div>
            <div className="flex justify-end">
              <Button
                color="primary"
                startContent={<Send className="w-4 h-4" />}
                onPress={handleSubmitComment}
                isLoading={isSubmitting}
                isDisabled={!newComment.trim()}
              >
                发表评论
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 评论列表 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          评论列表 {comments.length > 0 && <Chip size="sm" variant="flat">{comments.length}</Chip>}
        </h3>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            加载中...
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id}>
                {renderComment(comment)}
                {/* 渲染回复 */}
                {comment.replies && comment.replies.map(reply => 
                  renderComment(reply, true)
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            暂无评论，快来发表第一条评论吧！
          </div>
        )}
      </div>
      
      {/* 编辑弹窗 */}
      <Modal isOpen={isOpenEdit} onClose={onCloseEdit}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            重新编辑评论
          </ModalHeader>
          <ModalBody>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              minRows={2}
              maxRows={8}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onCloseEdit}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={handleUpdateComment}
              isDisabled={updating}
              isLoading={updating}
            >
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 删除弹窗 */}
      <Modal isOpen={isOpenDelete} onClose={onCloseDelete} placement="center">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">删除评论</ModalHeader>
          <ModalBody>
            <p>
              您确定要删除这条评论吗？该操作不可撤销。
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onCloseDelete}>
              取消
            </Button>
            <Button
              color="danger"
              onPress={handleDeleteComment}
              isDisabled={deleting}
              isLoading={deleting}
            >
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 举报弹窗 */}
      <Modal isOpen={isOpenReport} onClose={onCloseReport}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">举报评论</ModalHeader>
          <ModalBody>
            <Textarea
              label="举报原因"
              isRequired
              placeholder="请填写举报原因"
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onCloseReport}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={handleSubmitReport}
              isDisabled={reporting}
              isLoading={reporting}
            >
              提交
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}