'use client'

import { Button, Input } from '@heroui/react'
import { useRewritePatchStore } from '~/store/rewriteStore'
import toast from 'react-hot-toast'
import { parseVndbWorkId } from '~/utils/vndbId'

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

    const parsed = parseVndbWorkId(data.vndbId)
    if (!parsed.ok) {
      toast.error(parsed.message)
      return
    }

    toast('正在从 NextMoe 获取别名与发售日...')
    try {
      const spiderResponse = await fetch('/api/spider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vndbId: parsed.id })
      })

      if (!spiderResponse.ok) {
        let message = '获取失败'
        try {
          const errBody = await spiderResponse.json()
          if (errBody?.error) message = errBody.error
        } catch {
          // ignore non-JSON error bodies
        }
        toast.error(message)
        return
      }

      const meta = await spiderResponse.json()
      const nextVndbId = meta.vndbId || parsed.id
      setVNDBId(nextVndbId)
      setData({
        ...data,
        vndbId: nextVndbId,
        alias: meta.alias && meta.alias.length ? meta.alias : data.alias,
        released: meta.released || data.released
      })
      toast.success('获取数据成功! 已为您自动添加游戏别名')
    } catch {
      toast.error('获取失败')
    }

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
