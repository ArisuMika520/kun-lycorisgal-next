import { KunAvatar } from '~/components/kun/floating-card/KunAvatar'
import { Card, CardBody } from '@heroui/card'
import { ThumbsUp, MessageSquare, FileText } from 'lucide-react'
import { formatDate } from '~/utils/time'
import Link from 'next/link'
import { CommentEdit } from './CommentEdit'
import type { AdminComment } from '~/types/api/admin'

interface Props {
  comment: AdminComment
}

export const CommentCard = ({ comment }: Props) => {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <KunAvatar
              uid={comment.user.id}
              avatarProps={{
                name: comment.user.name,
                src: comment.user.avatar || undefined
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{comment.user.name}</h2>
                <span className="text-small text-default-500 flex items-center gap-1">
                  {comment.type === 'patch' ? (
                    <>
                      <FileText size={14} />
                      评论在 Galgame{' '}
                      <Link
                        className="text-primary-500"
                        href={`/${comment.uniqueId}`}
                      >
                        {comment.patchName}
                      </Link>
                    </>
                  ) : (
                    <>
                      <MessageSquare size={14} />
                      评论在话题{' '}
                      <Link
                        className="text-primary-500"
                        href={`/topic/${comment.patchId}`}
                      >
                        {comment.patchName}
                      </Link>
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1">{comment.content}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-small text-default-500">
                  <ThumbsUp size={14} />
                  {comment.like}
                </div>
                <span className="text-small text-default-500">
                  {formatDate(comment.created, {
                    isPrecise: true,
                    isShowYear: true
                  })}
                </span>
              </div>
            </div>
          </div>

          <CommentEdit initialComment={comment} />
        </div>
      </CardBody>
    </Card>
  )
}
