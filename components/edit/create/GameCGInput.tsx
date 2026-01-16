'use client'

import { useRef, ChangeEvent } from 'react'
import { Button } from '@heroui/react'
import { X, ImagePlus } from 'lucide-react'
import { useCreatePatchStore } from '~/store/editStore'
import { v4 as uuidv4 } from 'uuid'

interface Props {
    errors?: string
}

export const GameCGInput = ({ errors }: Props) => {
    const { data, setData } = useCreatePatchStore()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file,
                id: uuidv4(),
                preview: URL.createObjectURL(file)
            }))
            const newGameCG = [...data.gameCG, ...newFiles]
            setData({ ...data, gameCG: newGameCG })
        }
    }

    const removeCG = (index: number) => {
        const target = data.gameCG[index];
        if (typeof target !== 'string') {
            URL.revokeObjectURL(target.preview);
        }
        const newCG = [...data.gameCG];
        newCG.splice(index, 1);
        setData({ ...data, gameCG: newCG });
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl">游戏CG</h2>
            {errors && <p className="text-xs text-danger-500">{errors}</p>}

            <p className="text-sm text-default-500">
                请点击下方按钮选择本地图片上传，或保持自动抓取的预览图。
            </p>

            <div className="flex flex-wrap gap-4">
                {(data.gameCG ?? []).map((item, index) => {
                    const src = typeof item === 'string' ? item : item.preview;
                    return (
                        <div key={index} className="relative group w-48 h-32 rounded-lg overflow-hidden border border-default-200 bg-black/5">
                            <img
                                src={src}
                                className="w-full h-full object-cover"
                                alt={`cg-${index}`}
                            />
                            <button
                                onClick={() => removeCG(index)}
                                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                type="button"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )
                })}

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-48 h-32 rounded-lg border-2 border-dashed border-default-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:text-primary text-default-400 transition-colors"
                >
                    <ImagePlus size={24} />
                    <span className="text-xs mt-2">点击上传图片</span>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                />
            </div>
        </div>
    )
}
