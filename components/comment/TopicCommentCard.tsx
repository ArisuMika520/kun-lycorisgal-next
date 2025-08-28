'use client'

import { useState } from 'react'
import { Card, CardBody, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from '@heroui/modal'
import { Textarea } from '@heroui/input'
import { Heart, Reply, Edit, Trash2, Flag, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { KunAvatar } from '~/components/kun/floating-card/KunAvatar'
import { MarkdownRenderer } from '~/components/kun/MarkdownRenderer'
import { KunEditor } from '~/components/kun/milkdown/Editor'
import { formatDistanceToNow } from '~/utils/formatDistanceToNow'
import { useUserStore } from '~/store/userStore'
import { kunFetchPost, kunFetchPut, kunFetchDelete } from '~/utils/kunFetch'
import toast from 'react-hot-toast'
import type { TopicComment } from '~/types/api/topic-comment'

interface Props {
  comment: TopicComment
  topicId: number
  onUpdate?: () => void
  level?: number
}

// 递归计算所有子评论的总数
const countAllReplies = (comment: TopicComment): number => {
  if (!comment.replies || comment.replies.length === 0) {
    return 0
  }
  
  let count = comment.replies.length
  comment.replies.forEach(reply => {
    count += countAllReplies(reply)
  })
  
  return count
}

export const TopicCommentCard = ({ comment, topicId, onUpdate, level = 0 }: Props) => {
  const { user } = useUserStore((state) => state)
  const [isLiking, setIsLiking] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [editContent, setEditContent] = useState(comment.content)
  const [reportContent, setReportContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [localComment, setLocalComment] = useState(comment)
  
  // 计算所有子评论总数，只对顶级评论（level === 0）进行折叠判断
  const totalRepliesCount = countAllReplies(localComment)
  const [isRepliesCollapsed, setIsRepliesCollapsed] = useState(
    level === 0 && totalRepliesCount >= 3
  )

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

  const handleLike = async () => {
    if (!user || isLiking) return

    setIsLiking(true)
    try {
      const response = await kunFetchPost<{ isLiked: boolean; likeCount: number }>(
        '/api/topic/comment/like',
        { commentId: comment.id }
      )

      setLocalComment(prev => ({
        ...prev,
        isLiked: response.isLiked,
        like_count: response.likeCount
      }))
    } catch (error) {
      toast.error('请登录后再点赞')
    } finally {
      setIsLiking(false)
    }
  }

  const handleReply = async () => {
    if (!replyContent.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await kunFetchPost('/api/topic/comment', {
        topicId,
        content: replyContent,
        parentId: comment.id
      })

      setReplyContent('')
      setShowReplyForm(false)
      toast.success('回复成功')
      onUpdate?.()
    } catch (error) {
      toast.error('请登录后再回复')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editContent.trim() || isUpdating) return

    setIsUpdating(true)
    try {
      await kunFetchPut('/api/topic/comment', {
        commentId: comment.id,
        content: editContent
      })

      setLocalComment(prev => ({ ...prev, content: editContent }))
      onCloseEdit()
      toast.success('编辑成功')
      onUpdate?.()
    } catch (error) {
      toast.error('请登录后再编辑')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return

    setIsDeleting(true)
    try {
      await kunFetchDelete('/api/topic/comment', {
        commentId: comment.id
      })

      onCloseDelete()
      toast.success('删除成功')
      onUpdate?.()
    } catch (error) {
      toast.error('请登录后再删除')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReport = async () => {
    if (!reportContent.trim() || isReporting) return

    setIsReporting(true)
    try {
      await kunFetchPost('/api/topic/comment/report', {
        commentId: comment.id,
        topicId: topicId,
        content: reportContent
      })

      setReportContent('')
      onCloseReport()
      toast.success('举报已提交')
    } catch (error) {
      toast.error('请登录后再举报')
    } finally {
      setIsReporting(false)
    }
  }

  const saveReplyMarkdown = (markdown: string) => {
    setReplyContent(markdown)
  }

  const saveEditMarkdown = (markdown: string) => {
    setEditContent(markdown)
  }

  // 权限检查
  const canEdit = user?.uid === comment.user.id
  const canDelete = user?.uid === comment.user.id || (user?.role && user.role >= 3)
  const canReport = user && user.uid !== comment.user.id

  return (
    <div 
      id={`comment-${comment.id}`}
      className="transition-all duration-300"
    >
      <Card className="w-full">
        <CardBody className="p-4">
          <div className="space-y-3">
            {/* 用户信息和操作菜单 */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <KunAvatar
                  uid={comment.user.id}
                  avatarProps={{
                    name: comment.user.name,
                    src: comment.user.avatar || undefined,
                    size: 'sm'
                  }}
                />
                <div>
                  <h4 className="font-medium">{comment.user.name}</h4>
                  <span className="text-small text-default-500">
                    {formatDistanceToNow(new Date(comment.created))}
                  </span>
                </div>
              </div>

              {user && (
                <Dropdown>
                  <DropdownTrigger>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      className="text-default-400"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="评论操作">
                    <DropdownItem
                      key="edit"
                      startContent={<Edit className="w-4 h-4" />}
                      onPress={() => {
                        setEditContent(comment.content)
                        onOpenEdit()
                      }}
                      className={!canEdit ? 'hidden' : ''}
                    >
                      编辑
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      className={`text-danger ${!canDelete ? 'hidden' : ''}`}
                      color="danger"
                      startContent={<Trash2 className="w-4 h-4" />}
                      onPress={onOpenDelete}
                    >
                      删除
                    </DropdownItem>
                    <DropdownItem
                      key="report"
                      startContent={<Flag className="w-4 h-4" />}
                      onPress={onOpenReport}
                      className={!canReport ? 'hidden' : ''}
                    >
                      举报
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              )}
            </div>

            {/* 被回复的内容（仅对二级及以上评论显示） */}
            {level > 0 && comment.parent && (
              <div 
                className="mb-3 p-3 bg-default-100 dark:bg-default-50 rounded-lg border-l-4 border-primary cursor-pointer hover:bg-default-200 dark:hover:bg-default-100 transition-colors"
                onClick={() => {
                  const parentElement = document.getElementById(`comment-${comment.parent!.id}`)
                  if (parentElement) {
                    parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    // 添加高亮效果
                    parentElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50')
                    setTimeout(() => {
                      parentElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50')
                    }, 2000)
                  }
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-foreground/60">回复</span>
                  <KunAvatar
                    uid={comment.parent.user.id}
                    avatarProps={{
                      name: comment.parent.user.name,
                      src: (comment.parent.user as any).avatar && (comment.parent.user as any).avatar.trim() !== '' ? (comment.parent.user as any).avatar : undefined,
                      size: 'sm'
                    }}
                  />
                  <span className="text-sm font-medium text-foreground/80">{comment.parent.user.name}</span>
                  <span className="text-xs text-foreground/50 ml-auto">点击跳转</span>
                </div>
                <div className="kun-prose max-w-none text-sm text-foreground/70" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  <MarkdownRenderer content={comment.parent.content} />
                </div>
              </div>
            )}

            {/* 评论内容 */}
            <div className="kun-prose max-w-none">
              <MarkdownRenderer content={localComment.content} />
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="light"
                color={localComment.isLiked ? 'danger' : 'default'}
                startContent={<Heart className={`w-4 h-4 ${localComment.isLiked ? 'fill-current' : ''}`} />}
                onPress={user ? handleLike : () => toast.error('请先登录后点赞')}
                isLoading={isLiking}
                className="text-small"
              >
                {localComment.like_count}
              </Button>

              <Button
                size="sm"
                variant="light"
                startContent={<Reply className="w-4 h-4" />}
                onPress={user ? () => setShowReplyForm(!showReplyForm) : () => toast.error('请先登录后回复')}
                className="text-small"
              >
                回复
              </Button>
            </div>

            {/* 回复表单 */}
            {showReplyForm && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <div className="min-h-[150px] border border-gray-200 rounded-lg">
                  <KunEditor
                    valueMarkdown={replyContent}
                    saveMarkdown={saveReplyMarkdown}
                    placeholder={`回复 @${comment.user.name}...`}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    onPress={handleReply}
                    isLoading={isSubmitting}
                    isDisabled={!replyContent.trim()}
                  >
                    发送
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setShowReplyForm(false)
                      setReplyContent('')
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* 渲染回复 - 无极评论模式，所有回复都平铺显示 */}
      {localComment.replies && localComment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {/* 折叠控制按钮 - 只在顶级评论且总回复数>=3时显示 */}
          {level === 0 && totalRepliesCount >= 3 && (
            <Button
              size="sm"
              variant="light"
              className="mb-2 text-small text-default-500"
              startContent={isRepliesCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              onPress={() => setIsRepliesCollapsed(!isRepliesCollapsed)}
            >
              {isRepliesCollapsed ? `展开 ${totalRepliesCount} 条回复` : '收起回复'}
            </Button>
          )}
          
          {/* 回复列表 - 平铺显示，不再嵌套 */}
          <div className={`space-y-4 ${isRepliesCollapsed ? 'hidden' : ''}`}>
            {localComment.replies.map((reply) => (
              <TopicCommentCard
                key={reply.id}
                comment={reply}
                topicId={topicId}
                onUpdate={onUpdate}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      <Modal isOpen={isOpenEdit} onClose={onCloseEdit} size="2xl">
        <ModalContent>
          <ModalHeader>编辑评论</ModalHeader>
          <ModalBody>
            <div className="min-h-[200px] border border-gray-200 rounded-lg">
              <KunEditor
                valueMarkdown={editContent}
                saveMarkdown={saveEditMarkdown}
                placeholder="编辑你的评论..."
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onCloseEdit}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={handleEdit}
              isLoading={isUpdating}
              isDisabled={!editContent.trim()}
            >
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 删除弹窗 */}
      <Modal isOpen={isOpenDelete} onClose={onCloseDelete}>
        <ModalContent>
          <ModalHeader>删除评论</ModalHeader>
          <ModalBody>
            <p>确定要删除这条评论吗？此操作不可撤销。</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onCloseDelete}>
              取消
            </Button>
            <Button
              color="danger"
              onPress={handleDelete}
              isLoading={isDeleting}
            >
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 举报弹窗 */}
      <Modal isOpen={isOpenReport} onClose={onCloseReport}>
        <ModalContent>
          <ModalHeader>举报评论</ModalHeader>
          <ModalBody>
            <Textarea
              label="举报原因"
              placeholder="请描述举报原因..."
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onCloseReport}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={handleReport}
              isLoading={isReporting}
              isDisabled={!reportContent.trim()}
            >
              提交举报
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}