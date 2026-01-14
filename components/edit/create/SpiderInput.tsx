'use client'

import { useState } from 'react'
import { Button, Input, Accordion, AccordionItem } from '@heroui/react'
import { useCreatePatchStore } from '~/store/editStore'
import toast from 'react-hot-toast'
import localforage from 'localforage'

interface Props {
    onDataFetch: () => void
}

export const SpiderInput = ({ onDataFetch }: Props) => {
    const { data, setData } = useCreatePatchStore()

    const [spiderVndbId, setSpiderVndbId] = useState('')
    const [spiderDlsiteId, setSpiderDlsiteId] = useState('')
    const [spiderTouchgalUrl, setSpiderTouchgalUrl] = useState('')
    const [loading, setLoading] = useState(false)

    const handleFetch = async () => {
        if (!spiderVndbId && !spiderDlsiteId && !spiderTouchgalUrl) {
            toast.error('请至少填写一项信息 (VNDB ID, DLsite ID, 或 TouchGal URL)')
            return
        }

        setLoading(true)
        const toastId = toast.loading('正在云端获取游戏数据, 这可能需要几十秒...')

        try {
            const response = await fetch('/api/spider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vndbId: spiderVndbId,
                    dlsiteId: spiderDlsiteId,
                    touchgalUrl: spiderTouchgalUrl
                })
            })

            if (!response.ok) {
                throw new Error('API请求失败')
            }

            const meta = await response.json()

            let bannerBlob: Blob | null = null;
            if (meta.banner) {
                try {
                    const imgRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(meta.banner)}`);
                    if (imgRes.ok) {
                        bannerBlob = await imgRes.blob();
                        await localforage.setItem('kun-patch-banner', bannerBlob);
                    }
                } catch (e) {
                    console.error("Failed to fetch banner image", e)
                    toast.error("获取封面图片失败，请手动上传")
                }
            }

            // Assign separate fields
            const newGameCG = meta.screenshots && meta.screenshots.length > 0 ? meta.screenshots : data.gameCG;

            const newGameLink = [...data.gameLink];
            if (meta.website) {
                // Check if website already exists
                if (!newGameLink.some(l => l.link === meta.website)) {
                    newGameLink.push({ name: '官网', link: meta.website });
                }
            }

            const newDevelopers = [...data.developers];
            if (meta.companies && Array.isArray(meta.companies)) {
                meta.companies.forEach((c: { name: string }) => {
                    if (c.name && !newDevelopers.includes(c.name)) {
                        newDevelopers.push(c.name);
                    }
                });
            }

            setData({
                ...data,
                name: meta.name || data.name,
                // Only text for introduction
                introduction: meta.introduction || data.introduction || '',
                released: meta.released || data.released,
                vndbId: meta.vndbId || data.vndbId,
                dlsiteId: meta.dlsiteId || data.dlsiteId,
                alias: meta.alias && meta.alias.length ? meta.alias : data.alias,
                tag: meta.tag && meta.tag.length ? meta.tag : data.tag,
                gameCG: newGameCG,
                gameLink: newGameLink,
                developers: newDevelopers
            })

            toast.success('数据获取成功并已填入表单!', { id: toastId })
            onDataFetch()

        } catch (e) {
            console.error(e)
            toast.error('获取数据失败, 请检查输入或稍后重试', { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full">
            <Accordion variant="bordered">
                <AccordionItem key="1" aria-label="自动获取数据" title="✨ 全自动获取游戏数据 (推荐)">
                    <div className="space-y-4 p-2">
                        <p className="text-sm text-default-500">
                            输入以下任意信息，我们将自动为您从 VNDB, DLsite, Steam, Bangumi 和 TouchGal 聚合游戏元数据。
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="VNDB ID"
                                placeholder="例如 v123456"
                                value={spiderVndbId}
                                onValueChange={setSpiderVndbId}
                            />
                            <Input
                                label="DLsite ID"
                                placeholder="例如 RJ01003344"
                                value={spiderDlsiteId}
                                onValueChange={setSpiderDlsiteId}
                            />
                            <Input
                                className="md:col-span-2"
                                label="TouchGal URL"
                                placeholder="例如 https://www.touchgal.top/game/..."
                                value={spiderTouchgalUrl}
                                onValueChange={setSpiderTouchgalUrl}
                            />
                        </div>

                        <Button
                            color="secondary"
                            isLoading={loading}
                            onPress={handleFetch}
                            className="w-full font-bold"
                        >
                            {loading ? '正在分析并聚合数据...' : '一键获取并填入'}
                        </Button>
                    </div>
                </AccordionItem>
            </Accordion>
        </div>
    )
}
