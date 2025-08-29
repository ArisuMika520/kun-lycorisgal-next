'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Input, Button } from '@heroui/react'
import { useRouter } from 'next/navigation'
import { KunDualEditorProvider } from '~/components/kun/milkdown/DualEditorProvider'
import { markdownToText } from '~/utils/markdownToText'
import { kunFetchPut } from '~/utils/kunFetch'
import { useCreateTopicStore } from '~/store/topicStore'
import type { Topic } from '~/types/api/topic'

interface EditTopicProps {
  topic: Topic
  onCancel: () => void
  onSuccess: (updatedTopic: Topic) => void
}

export const EditTopic = ({ topic, onCancel, onSuccess }: EditTopicProps) => {
  const router = useRouter()
  const { data, setData, resetData } = useCreateTopicStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{
    title?: string
    content?: string
  }>({})

  // 初始化编辑器内容
  useEffect(() => {
    // 设置编辑器的初始内容为当前话题的内容
    setData({
      title: topic.title,
      content: topic.content
    })
  }, [topic.title, topic.content, setData])

  const handleSubmit = async () => {
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
      const result = await kunFetchPut<{ topic: Topic }>(`/api/topic/${topic.id}`, {
        title: data.title.trim(),
        content: data.content.trim()
      })
      
      // 编辑成功
      onSuccess(result.topic)
    } catch (error) {
      console.error('编辑话题失败:', error)
      // 这里可以添加错误处理逻辑
    } finally {
      setIsSubmitting(false)
    }
  }



  return (
    <form className="w-full max-w-5xl py-4 mx-auto">
      <Card className="w-full">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <h1 className="text-2xl">编辑话题</h1>
            <p className="text-small text-default-500">
              修改你的话题内容
            </p>
          </div>
        </CardHeader>
        <CardBody className="mt-4 space-y-8">
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
              {isSubmitting ? '保存中...' : '保存修改'}
            </Button>
            <Button
              variant="light"
              size="lg"
              onPress={onCancel}
              isDisabled={isSubmitting}
            >
              取消
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  )
}