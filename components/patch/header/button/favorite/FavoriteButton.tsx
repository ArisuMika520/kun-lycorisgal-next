'use client'

import { Button, useDisclosure } from '@heroui/react'
import { Tooltip } from '@heroui/tooltip'
import { Heart } from 'lucide-react'
import { useUserStore } from '~/store/userStore'
import toast from 'react-hot-toast'
import { cn } from '~/utils/cn'
import { FavoriteModal } from './FavoriteModal'

interface Props {
  patchId: number
  isFavorite: boolean
  variant?: 'icon' | 'rail'
  className?: string
}

export const FavoriteButton = ({
  patchId,
  isFavorite,
  variant = 'icon',
  className
}: Props) => {
  const { user } = useUserStore((state) => state)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const toggleLike = async () => {
    if (!user.uid) {
      toast.error('请登录以收藏')
      return
    }

    onOpen()
  }

  if (variant === 'rail') {
    return (
      <>
        <button
          type="button"
          className={className}
          onClick={toggleLike}
          aria-label={isFavorite ? '已收藏' : '收藏'}
          title={isFavorite ? '已收藏' : '收藏'}
          aria-pressed={isFavorite}
        >
          <Heart
            className="size-4"
            fill={isFavorite ? 'currentColor' : 'none'}
          />
        </button>
        <FavoriteModal patchId={patchId} isOpen={isOpen} onClose={onClose} />
      </>
    )
  }

  return (
    <>
      <Tooltip key="favorite" content={isFavorite ? '取消收藏' : '收藏'}>
        <Button
          isIconOnly
          size="sm"
          color={isFavorite ? 'danger' : 'default'}
          variant={isFavorite ? 'flat' : 'bordered'}
          onPress={toggleLike}
          aria-label={isFavorite ? '取消收藏' : '收藏'}
          className="min-w-0 px-2"
        >
          <Heart
            fill={isFavorite ? '#f31260' : 'none'}
            className={cn('size-4', isFavorite ? 'text-danger-500' : '')}
          />
        </Button>
      </Tooltip>

      <FavoriteModal patchId={patchId} isOpen={isOpen} onClose={onClose} />
    </>
  )
}
