'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, Input, Button } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { useCreateTopicStore } from '~/store/topicStore'
import { KunDualEditorProvider } from '~/components/kun/milkdown/DualEditorProvider'
import { markdownToText } from '~/utils/markdownToText'
import { kunFetchPost } from '~/utils/kunFetch'
import { useUserStore } from '~/store/userStore'
import toast from 'react-hot-toast'
import { MessageCircle } from 'lucide-react'

export const CreateTopic = () => {
  const router = useRouter()
  const { user } = useUserStore((state) => state)
  const { data, setData, resetData } = useCreateTopicStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{
    title?: string
    content?: string
  }>({})

  const handleSubmit = async () => {
    // 检查用户登录状态
    if (!user) {
      toast.error('请先登录后创建话题')
      return
    }

    // 验证表单
    const newErrors: typeof errors = {}
    
    if (!data.title.trim()) {
      newErrors.title = '请输入话题标题'
    } else if (data.title.length > 200) {
      newErrors.title = '标题不能超过200个字符'
    }
    
    if (!data.content.trim()) {
      newErrors.content = '请输入话题内容'
    } else if (markdownToText(data.content).length < 10) {
      newErrors.content = '内容至少需要10个字符'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setIsSubmitting(true)
    setErrors({})
    
    try {
      const result = await kunFetchPost<{ topic: { id: number } }>('/api/topic', {
        title: data.title.trim(),
        content: data.content.trim()
      })
      
      // 创建成功
      resetData()
      router.push(`/topic/${result.topic.id}`)
    } catch (error) {
      console.error('创建话题失败:', error)
      toast.error('请登录后再创建话题')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="w-full max-w-5xl py-4 mx-auto">
      <Card className="w-full">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <h1 className="text-2xl">创建新话题</h1>
            <p className="text-small text-default-500">
              分享你的想法，与社区成员讨论
            </p>
          </div>
        </CardHeader>
        <CardBody className="mt-4 space-y-8">
          {!user && (
            <div className="text-center py-8 space-y-4 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg">请先登录后创建话题</p>
                <p className="text-sm">登录后即可发布话题，与社区成员分享讨论</p>
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
          {user && (
            <>
          <div className="space-y-2">
            <h2 className="text-xl">话题标题 (必须)</h2>
            <Input
              isRequired
              variant="underlined"
              labelPlacement="outside"
              placeholder="输入话题标题，简洁明了地描述你要讨论的内容"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              isInvalid={!!errors.title}
              errorMessage={errors.title}
              maxLength={200}
            />
            <p className="text-small text-default-500">
              字数: {data.title.length}/200
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl">话题内容 (必须)</h2>
            <p className="text-small text-default-500">
              详细描述你的想法，支持 Markdown 格式
            </p>
            {errors.content && (
              <p className="text-xs text-danger-500">{errors.content}</p>
            )}

            <KunDualEditorProvider storeName="topicCreate" />

            <p className="text-small text-default-500">
              字数: {markdownToText(data.content).length}
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              color="primary"
              size="lg"
              onPress={handleSubmit}
              isLoading={isSubmitting}
              isDisabled={!data.title.trim() || !data.content.trim()}
            >
              {isSubmitting ? '创建中...' : '创建话题'}
            </Button>
            <Button
              variant="light"
              size="lg"
              onPress={() => {
                resetData()
                router.back()
              }}
              isDisabled={isSubmitting}
            >
              取消
            </Button>
          </div>
            </>
          )}
        </CardBody>
      </Card>
    </form>
  )
}