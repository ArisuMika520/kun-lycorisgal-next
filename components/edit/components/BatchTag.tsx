import { useState } from 'react'
import { Input, Chip } from '@heroui/react'
import { X } from 'lucide-react'

interface Props {
  initialTag: string[]
  saveTag: (tag: string[]) => void
  errors?: string
}

export const BatchTag = ({ initialTag, saveTag, errors }: Props) => {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue.trim())
    }
  }

  const addTag = (val: string) => {
    if (!initialTag.includes(val)) {
      saveTag([...initialTag, val])
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    saveTag(initialTag.filter((t) => t !== tagToRemove))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl">游戏标签 (可选)</h2>
        <p className="text-sm text-default-500">
          建议添加3-5个描述性标签。输入标签名后按回车添加。
        </p>
      </div>

      <div className="flex flex-wrap gap-2 min-h-12 p-4 bg-default-50 rounded-lg border-2 border-dashed border-default-200">
        {initialTag.length === 0 && (
          <div className="w-full text-center text-default-400 py-2">
            暂无标签
          </div>
        )}
        {initialTag.map((tag, index) => (
          <Chip
            key={`${tag}-${index}`}
            variant="flat"
            color="primary"
            classNames={{
              base: "h-8 px-2",
              content: "text-sm font-medium"
            }}
            endContent={
              <button
                onClick={() => removeTag(tag)}
                className="p-0.5 ml-1 rounded-full hover:bg-primary-200 transition-colors"
              >
                <X size={14} />
              </button>
            }
          >
            {tag}
          </Chip>
        ))}
      </div>

      <Input
        placeholder="输入标签名，按回车添加..."
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={handleKeyDown}
        isInvalid={!!errors}
        errorMessage={errors}
        endContent={
          inputValue && (
            <button
              onClick={() => addTag(inputValue)}
              className="focus:outline-none bg-primary text-white text-xs px-3 py-1 rounded-md"
            >
              添加
            </button>
          )
        }
      />
    </div>
  )
}
