'use client'

import { Button, Input, Card, CardBody } from '@heroui/react'
import { Plus, X, Link as LinkIcon, ExternalLink } from 'lucide-react'
import { useCreatePatchStore } from '~/store/editStore'

interface Props {
    errors?: string
}

export const GameLinkInput = ({ errors }: Props) => {
    const { data, setData } = useCreatePatchStore()

    const addLink = () => {
        setData({
            ...data,
            gameLink: [...data.gameLink, { name: '', link: '' }]
        })
    }

    const removeLink = (index: number) => {
        const newLinks = [...data.gameLink];
        newLinks.splice(index, 1);
        setData({ ...data, gameLink: newLinks });
    }

    const updateLink = (index: number, field: 'name' | 'link', value: string) => {
        const newLinks = [...data.gameLink];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setData({ ...data, gameLink: newLinks });
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl">外部链接</h2>
                <Button size="sm" color="primary" variant="flat" startContent={<Plus size={16} />} onPress={addLink}>
                    添加链接
                </Button>
            </div>

            {errors && <p className="text-xs text-danger-500">{errors}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.gameLink.map((item, index) => (
                    <Card key={index} className="border border-default-200">
                        <CardBody className="flex flex-row items-center gap-2 p-3">
                            <div className="p-2 bg-default-100 rounded-lg text-default-500">
                                <LinkIcon size={20} />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Input
                                    label="链接名称"
                                    size="sm"
                                    variant="underlined"
                                    value={item.name}
                                    onChange={(e) => updateLink(index, 'name', e.target.value)}
                                    placeholder="如: 官方网站"
                                />
                                <Input
                                    label="URL"
                                    size="sm"
                                    variant="underlined"
                                    value={item.link}
                                    onChange={(e) => updateLink(index, 'link', e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                            <Button isIconOnly color="danger" variant="light" size="sm" onPress={() => removeLink(index)}>
                                <X size={18} />
                            </Button>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {data.gameLink.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-default-400 bg-default-50 rounded-lg border border-dashed border-default-200">
                    <ExternalLink size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">暂无外部链接，点击右上角添加</p>
                </div>
            )}
        </div>
    )
}
