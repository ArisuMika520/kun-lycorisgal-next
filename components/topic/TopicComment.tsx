'use client'

import { useState } from 'react'
import { Card, CardBody, Button, Avatar, Textarea } from '@heroui/react'
import { Heart, MessageCircle, Reply } from 'lucide-react'
import { formatDistanceToNow } from '~/utils/formatDistanceToNow'
import { kunFetchPost } from '~/utils/kunFetch'
import type { TopicComment } from '~/types/api/topic-comment'

interface Props {
  comment: TopicComment
  topicId: number
  onReply?: (parentId: number, content: string) => void
  level?: number
}

export const TopicCommentCard = ({ comment, topicId, onReply, level = 0 }: Props) => {
  const [isLiking, setIsLiking] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localComment, setLocalComment] = useState(comment)

  const handleLike = async () => {
    if (isLiking) return
    
    setIsLiking(true)
    try {
      const response = await kunFetchPost<{ liked: boolean }>('/api/topic/comment/like', {
        commentId: comment.id
      })
      
      setLocalComment(prev => ({
        ...prev,
        isLiked: response.liked,
        like_count: response.liked ? prev.like_count + 1 : prev.like_count - 1
      }))
    } catch (error) {
      console.error('点赞失败:', error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleReply = async () => {
    if (!replyContent.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onReply?.(comment.id, replyContent)
      setReplyContent('')
      setShowReplyForm(false)
    } catch (error) {
      console.error('回复失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`${level > 0 ? 'ml-8 mt-4' : ''}`}>
      <Card className="w-full">
        <CardBody className="p-4">
          <div className="flex gap-3">
            <Avatar
              src={localComment.user.avatar}
              name={localComment.user.name}
              size="sm"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">{localComment.user.name}</span>
                {localComment.parent && (
                  <span className="text-xs text-foreground/60">
                    回复 @{localComment.parent.user.name}
                  </span>
                )}
                <span className="text-xs text-foreground/60">
                  {formatDistanceToNow(localComment.created)}
                </span>
              </div>
              
              <div className="text-sm mb-3 whitespace-pre-wrap">
                {localComment.content}
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  variant="light"
                  startContent={
                    <Heart className={`w-4 h-4 ${localComment.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  }
                  onPress={handleLike}
                  isLoading={isLiking}
                  className="text-xs"
                >
                  {localComment.like_count}
                </Button>
                
                <Button
                  size="sm"
                  variant="light"
                  startContent={<Reply className="w-4 h-4" />}
                  onPress={() => setShowReplyForm(!showReplyForm)}
                  className="text-xs"
                >
                  回复
                </Button>
              </div>
              
              {showReplyForm && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder={`回复 @${localComment.user.name}...`}
                    value={replyContent}
                    onValueChange={setReplyContent}
                    minRows={2}
                    maxRows={6}
                  />
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
          </div>
        </CardBody>
      </Card>
      
      {/* 渲染回复 */}
      {localComment.replies && localComment.replies.length > 0 && (
        <div className="mt-2">
          {localComment.replies.map((reply) => (
            <TopicCommentCard
              key={reply.id}
              comment={reply}
              topicId={topicId}
              onReply={onReply}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}