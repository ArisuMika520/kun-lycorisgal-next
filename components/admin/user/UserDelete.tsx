'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure
} from '@heroui/react'
import { Trash2 } from 'lucide-react'
import { kunFetchDelete } from '~/utils/kunFetch'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import { useUserStore } from '~/store/userStore'
import type { AdminUser } from '~/types/api/admin'

interface Props {
  user: AdminUser
}

export const UserDelete = ({ user }: Props) => {
  const currentUser = useUserStore((state) => state.user)

  const { isOpen, onOpen, onClose } = useDisclosure()
  const [deleting, setDeleting] = useState(false)
  const handleUpdateUserInfo = async () => {
    setDeleting(true)
    const res = await kunFetchDelete<KunResponse<{}>>('/api/admin/user', {
      uid: user.id
    })
    kunErrorHandler(res, () => {
      toast.success('删除用户成功，可在其个人主页恢复')
    })
    setDeleting(false)
    onClose()
  }

  return (
    <>
      {currentUser.role === 4 && (
        <Button
          isIconOnly
          size="sm"
          color="danger"
          variant="light"
          onPress={onOpen}
          // 与后端 guardManageUser 一致：不能删除同级用户；已删除的用户请到其主页恢复
          isDisabled={user.isDeleted || currentUser.role <= user.role}
        >
          <Trash2 size={16} />
        </Button>
      )}

      <Modal size="2xl" isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>删除用户: {user.name}</ModalHeader>
          <ModalBody>
            <div className="space-y-1">
              <p>您确定要删除用户 {user.name} 吗?</p>
              <p>
                该用户将无法登录，其资源、评论、话题和站内消息对所有人隐藏（数据保留），
                邮箱和注册 IP 将被永久禁止注册。
              </p>
              <p>之后可以在该用户的个人主页恢复。</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              取消
            </Button>
            <Button
              color="danger"
              isDisabled={deleting}
              isLoading={deleting}
              onPress={handleUpdateUserInfo}
            >
              删除用户
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
