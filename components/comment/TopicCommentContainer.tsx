'use client'

import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, Button, Chip } from '@heroui/react'
import { MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { kunFetchGet, kunFetchPost } from '~/utils/kunFetch'
import { TopicCommentCard } from './TopicCommentCard'
import { KunEditor } from '~/components/kun/milkdown/Editor'
import { KunLoading } from '~/components/kun/Loading'
import { useUserStore } from '~/store/userStore'
import toast from 'react-hot-toast'
import type { TopicComment } from '~/types/api/topic-comment'

interface Props {
  topicId: number
  initialComments?: TopicComment[]
  initialTotal?: number
}

export const TopicCommentContainer = ({
  topicId,
  initialComments = [],
  initialTotal = 0
}: Props) => {
  const { user } = useUserStore((state) => state)
  const [comments, setComments] = useState<TopicComment[]>(initialComments)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCommentsCollapsed, setIsCommentsCollapsed] = useState(comments.length >= 3)

  const fetchComments = async () => {
    setLoading(true)
    try {
      const response = await kunFetchGet<{
        comments: TopicComment[]
        total: number
      }>('/api/topic/comment', {
        topicId,
        sortField: 'created',
        sortOrder: 'desc',
        page: 1,
        limit: 50
      })

      setComments(response.comments)
      setTotal(response.total)
      setIsCommentsCollapsed(response.comments.length >= 3)
    } catch (error) {
      toast.error('获取评论失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting || !user) {
      if (!user) {
        toast.error('请先登录')
      }
      return
    }

    setIsSubmitting(true)
    try {
      await kunFetchPost('/api/topic/comment', {
        topicId,
        content: newComment
      })

      setNewComment('')
      toast.success('评论发表成功')
      await fetchComments() // 重新获取评论列表
    } catch (error) {
      toast.error('请登录后再发表评论')
    } finally {
      setIsSubmitting(false)
    }
  }

  const saveCommentMarkdown = (markdown: string) => {
    setNewComment(markdown)
  }

  useEffect(() => {
    if (initialComments.length === 0) {
      fetchComments()
    }
  }, [topicId])

  return (
    <div className="space-y-6">
      {/* 发表评论 */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="text-lg font-semibold">发表评论</h3>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          {user ? (
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
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg">请先登录后发表评论</p>
                <p className="text-sm">登录后即可参与讨论，分享你的想法</p>
              </div>
              <Button
                color="primary"
                variant="flat"
                onPress={() => {
                  // 这里可以添加跳转到登录页面的逻辑
                  toast.error('请先登录')
                }}
              >
                立即登录
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 评论列表 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="text-lg font-semibold">评论列表</h3>
          {total > 0 && (
            <Chip size="sm" variant="flat">
              {total}
            </Chip>
          )}
        </div>

        {loading ? (
          <KunLoading hint="正在获取评论数据..." />
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            {/* 折叠控制按钮 */}
            {comments.length >= 3 && (
              <div className="flex justify-center">
                <Button
                  variant="light"
                  size="sm"
                  startContent={
                    isCommentsCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )
                  }
                  onPress={() => setIsCommentsCollapsed(!isCommentsCollapsed)}
                >
                  {isCommentsCollapsed
                    ? `展开所有评论 (${comments.length})`
                    : '折叠评论'}
                </Button>
              </div>
            )}
            
            {/* 评论列表 */}
            <div className="space-y-4">
              {(isCommentsCollapsed ? comments.slice(0, 3) : comments).map((comment) => (
                <TopicCommentCard
                  key={comment.id}
                  comment={comment}
                  topicId={topicId}
                  onUpdate={fetchComments}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {user ? '暂无评论，快来发表第一条评论吧！' : '请登录后查看和发表评论'}
          </div>
        )}
      </div>
    </div>
  )
}