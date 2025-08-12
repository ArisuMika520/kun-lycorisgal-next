'use client'

import { Button, Input } from '@heroui/react'
import { useRewritePatchStore } from '~/store/rewriteStore'
import toast from 'react-hot-toast'
import type { VNDBResponse } from '../VNDB'

interface Props {
  vndbId: string
  setVNDBId: (vndbId: string) => void
  errors?: string
}

export const VNDBInput = ({ vndbId, setVNDBId, errors }: Props) => {
  const { data, setData } = useRewritePatchStore()

  const handleFetchVNDBData = async () => {
    if (!data.vndbId) {
      toast.error('VNDB ID 不可为空')
      return
    }

    toast('正在从 VNDB 获取数据...')
    const vndbResponse = await fetch(`https://api.vndb.org/kana/vn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filters: ['id', '=', data.vndbId],
        fields: 'title, titles.lang, titles.title, aliases, released'
      })
    })

    const vndbData: VNDBResponse = await vndbResponse.json()
    const allTitles = vndbData.results.flatMap((vn) => {
      const jaTitle = vn.titles.find((t) => t.lang === 'ja')?.title
      const titlesArray = [
        ...(jaTitle ? [jaTitle] : []),
        vn.title,
        ...vn.titles.filter((t) => t.lang !== 'ja').map((t) => t.title),
        ...vn.aliases
      ]
      return titlesArray
    })

    setData({
      ...data,
      alias: [...new Set(allTitles)],
      released: vndbData.results[0].released
    })

    toast.success('获取数据成功! 已为您自动添加游戏别名')
  }

  return (
    <div className="w-full space-y-2">
      <h2 className="text-xl">VNDB ID (可选)</h2>
      <Input
        variant="underlined"
        labelPlacement="outside"
        placeholder="请输入 VNDB ID, 例如 v19658"
        value={vndbId}
        onChange={(e) => setVNDBId(e.target.value)}
        isInvalid={!!errors}
        errorMessage={errors}
      />
      <p className="text-sm ">
        提示: VNDB ID 需要 VNDB 官网 (vndb.org)
        获取，当进入对应游戏的页面，游戏页面的 URL (形如
        https://vndb.org/v19658) 中的 v19658 就是 VNDB ID
      </p>
      <p className="text-sm text-default-500">
        <b>如果您点击获取数据, 您填写好的发售日期与别名有可能被覆盖</b>
      </p>
      <div className="flex items-center text-sm">
        {data.vndbId && (
          <Button
            className="mr-4"
            color="primary"
            size="sm"
            onPress={handleFetchVNDBData}
          >
            获取数据
          </Button>
        )}
      </div>
    </div>
  )
}
