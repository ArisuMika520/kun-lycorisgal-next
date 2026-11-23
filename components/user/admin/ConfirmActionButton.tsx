'use client'

import { type ReactNode, useState } from 'react'
import { Button } from '@heroui/button'
import { Input } from '@heroui/input'
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure
} from '@heroui/modal'

type ActionColor = 'danger' | 'success' | 'warning' | 'primary' | 'default'

interface Props {
  label: string
  icon: ReactNode
  color: ActionColor
  variant?: 'flat' | 'light' | 'solid' | 'bordered'
  isDisabled?: boolean
  // 确认弹窗内容
  title: string
  description: ReactNode
  confirmLabel: string
  // 设置后必须在弹窗中输入完全一致的文本（如用户名）才能确认，用于不可轻易撤回的操作
  requireTyping?: string
  // 执行操作；返回 true 表示成功并关闭弹窗，返回 false 保持弹窗打开（错误提示由调用方负责）
  onConfirm: () => Promise<boolean>
}

/**
 * 管理员快捷操作的二次确认按钮：点击按钮只打开确认弹窗，
 * 必须在弹窗中再次确认（必要时输入确认文本）才会执行 `onConfirm`。
 * 执行期间弹窗不可关闭，避免请求进行中被误关。
 */
export const ConfirmActionButton = ({
  label,
  icon,
  color,
  variant = 'flat',
  isDisabled = false,
  title,
  description,
  confirmLabel,
  requireTyping,
  onConfirm
}: Props) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [typed, setTyped] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isTypingMatched = !requireTyping || typed === requireTyping

  const handleClose = () => {
    setTyped('')
    onClose()
  }

  const handleConfirm = async () => {
    if (!isTypingMatched) {
      return
    }
    setSubmitting(true)
    try {
      if (await onConfirm()) {
        handleClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        startContent={icon}
        color={color}
        variant={variant}
        fullWidth
        isDisabled={isDisabled}
        onPress={onOpen}
      >
        {label}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        placement="center"
        isDismissable={!submitting}
        hideCloseButton={submitting}
      >
        <ModalContent>
          <ModalHeader>{title}</ModalHeader>
          <ModalBody>
            {description}
            {requireTyping && (
              <Input
                label={`请输入 ${requireTyping} 以确认`}
                value={typed}
                onValueChange={setTyped}
                isDisabled={submitting}
                autoComplete="off"
              />
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={handleClose}
              isDisabled={submitting}
            >
              取消
            </Button>
            <Button
              color={color === 'default' ? 'primary' : color}
              onPress={handleConfirm}
              isDisabled={!isTypingMatched || submitting}
              isLoading={submitting}
            >
              {confirmLabel}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
