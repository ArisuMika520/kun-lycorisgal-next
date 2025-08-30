'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '~/store/userStore'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react'
import { AlertTriangle } from 'lucide-react'

interface AdminGuardProps {
  children: React.ReactNode
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
  const router = useRouter()
  const { user } = useUserStore((state) => state)
  const [showModal, setShowModal] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // 等待用户状态加载完成
    const timer = setTimeout(() => {
      setIsChecking(false)
      
      // 检查用户是否已登录且为管理员 (role >= 3)
      if (!user.uid || user.uid === 0 || user.role < 3) {
        setShowModal(true)
        
        // 3秒后自动跳转
        const redirectTimer = setTimeout(() => {
          router.push('/')
        }, 3000)
        
        return () => clearTimeout(redirectTimer)
      }
    }, 500) // 给用户状态一些时间加载
    
    return () => clearTimeout(timer)
  }, [user.uid, user.role, router])

  const handleRedirect = () => {
    setShowModal(false)
    router.push('/')
  }

  // 正在检查权限时显示加载状态
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground/60">正在验证权限...</p>
        </div>
      </div>
    )
  }

  // 如果用户有权限，显示子组件
  if (user.uid && user.uid > 0 && user.role >= 3) {
    return <>{children}</>
  }

  // 显示权限不足的模态框
  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">访问受限</h1>
          <p className="text-foreground/60">该页面仅管理员可访问</p>
        </div>
      </div>
      
      <Modal 
        isOpen={showModal} 
        onClose={() => {}} 
        isDismissable={false}
        hideCloseButton
        size="md"
        classNames={{
          base: "bg-background border border-divider",
          header: "border-b border-divider",
          body: "py-6",
          footer: "border-t border-divider"
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-foreground">访问受限</span>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-foreground/70">
              抱歉，该页面仅管理员可以访问。您将在 3 秒后自动跳转到首页。
            </p>
          </ModalBody>
          <ModalFooter>
            <Button 
              color="primary" 
              onPress={handleRedirect}
              className="w-full"
            >
              立即跳转到首页
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}