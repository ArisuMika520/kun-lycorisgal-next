'use client'

import { useState } from 'react'
import { Input, Chip } from '@heroui/react'
import { Plus } from 'lucide-react'
import { useCreatePatchStore } from '~/store/editStore'

export const DeveloperInput = () => {
    const { data, setData } = useCreatePatchStore()
    const [inputValue, setInputValue] = useState('')

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault()
            addDeveloper(inputValue.trim())
        }
    }

    const addDeveloper = (val: string) => {
        if (!(data.developers ?? []).includes(val)) {
            setData({
                ...data,
                developers: [...(data.developers ?? []), val]
            })
        }
        setInputValue('')
    }

    const removeDeveloper = (index: number) => {
        const newDevs = [...(data.developers ?? [])]
        newDevs.splice(index, 1)
        setData({ ...data, developers: newDevs })
    }

    return (
        <div className="space-y-2">
            <h2 className="text-xl">制作会社 / 开发者</h2>
            <p className="text-sm text-default-500">
                输入开发者或社团名称后按回车添加
            </p>

            <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {(data.developers ?? []).map((dev, index) => (
                    <Chip key={index} onClose={() => removeDeveloper(index)} variant="flat" color="secondary">
                        {dev}
                    </Chip>
                ))}
            </div>

            <Input
                placeholder="输入名称 + 回车"
                value={inputValue}
                onValueChange={setInputValue}
                onKeyDown={handleKeyDown}
                endContent={
                    <div className="cursor-pointer" onClick={() => inputValue && addDeveloper(inputValue)}>
                        <Plus size={18} className="text-default-400" />
                    </div>
                }
            />
        </div>
    )
}
