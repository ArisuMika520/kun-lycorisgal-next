'use client'

import { useState } from 'react'
import { Button, Input, Link } from '@heroui/react'
import { useCreatePatchStore } from '~/store/editStore'
import toast from 'react-hot-toast'
import {
  getKunFetchErrorMessage,
  kunFetchGet,
  kunFetchPost
} from '~/utils/kunFetch'
import { parseVndbWorkId } from '~/utils/vndbId'
import localforage from 'localforage'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  errors: string | undefined
  onFetched: () => void
}

type SpiderFetchMeta = {
  name?: string | null
  introduction?: string | null
  released?: string | null
  alias?: string[]
  tag?: string[]
  banner?: string | null
  screenshots?: unknown
  website?: string
  contentLimit?: string
  companies?: { name?: string }[]
}

export const VNDBInput = ({ errors, onFetched }: Props) => {
  const { data, setData } = useCreatePatchStore()
  const [loading, setLoading] = useState(false)

  const handleFetch = async () => {
    const rawVndbId = data.vndbId.trim()
    if (!rawVndbId) {
      toast.error('VNDB ID 不可为空')
      return
    }

    const parsed = parseVndbWorkId(rawVndbId)
    if (!parsed.ok) {
      toast.error(parsed.message)
      return
    }

    if (data.vndbId !== parsed.id) {
      setData({ ...data, vndbId: parsed.id })
    }

    setLoading(true)
    const toastId = toast.loading('正在检查是否重复...')

    try {
      const duplicate = await kunFetchGet<KunResponse<{}>>(
        '/api/edit/duplicate',
        {
          vndbId: parsed.id
        }
      )
      if (typeof duplicate === 'string') {
        toast.error('游戏重复, 该游戏已经有人发布过了', { id: toastId })
        return
      }

      toast.loading('正在从 NextMoe 获取游戏数据...', { id: toastId })
      const meta = await kunFetchPost<SpiderFetchMeta>('/api/spider', {
        vndbId: parsed.id
      })

      let bannerSaved = false
      if (meta.banner) {
        try {
          const imgRes = await fetch(
            `/api/proxy-image?url=${encodeURIComponent(meta.banner)}`
          )
          if (imgRes.ok) {
            const bannerBlob = await imgRes.blob()
            await localforage.setItem('kun-patch-banner', bannerBlob)
            bannerSaved = true
          }
        } catch (error) {
          console.error('Failed to fetch banner image', error)
        }
      }
      if (!bannerSaved) {
        await localforage.removeItem('kun-patch-banner')
        toast.error('未获取到封面图片，请手动上传封面')
      }

      const screenshotUrls: string[] = Array.isArray(meta.screenshots)
        ? meta.screenshots.filter((url: unknown) => typeof url === 'string')
        : []
      const downloaded = (
        await Promise.all(
          screenshotUrls.map(async (url, index) => {
            try {
              const imgRes = await fetch(
                `/api/proxy-image?url=${encodeURIComponent(url)}`
              )
              if (!imgRes.ok) return null
              const blob = await imgRes.blob()
              const file = new File([blob], `cg-${index}.webp`, {
                type: blob.type || 'image/webp'
              })
              return {
                file,
                id: uuidv4(),
                preview: URL.createObjectURL(file)
              }
            } catch (error) {
              console.error('Failed to fetch screenshot', url, error)
              return null
            }
          })
        )
      ).filter(
        (item): item is { file: File; id: string; preview: string } =>
          item !== null
      )

      for (const item of data.gameCG) {
        if (typeof item !== 'string') URL.revokeObjectURL(item.preview)
      }

      if (downloaded.length < screenshotUrls.length) {
        toast.error(
          downloaded.length === 0
            ? '截图下载失败，已清空上次的截图'
            : '部分截图下载失败，已丢弃失败项'
        )
      }

      const newGameLink = [...data.gameLink]
      if (
        meta.website &&
        !newGameLink.some((link) => link.link === meta.website)
      ) {
        newGameLink.push({ name: '官网', link: meta.website })
      }

      const newDevelopers = [...data.developers]
      if (Array.isArray(meta.companies)) {
        meta.companies.forEach((company) => {
          if (company.name && !newDevelopers.includes(company.name)) {
            newDevelopers.push(company.name)
          }
        })
      }

      const contentLimit =
        meta.contentLimit === 'nsfw' || meta.contentLimit === 'sfw'
          ? meta.contentLimit
          : data.contentLimit

      setData({
        ...data,
        name: meta.name || data.name,
        introduction: meta.introduction || data.introduction || '',
        released: meta.released || data.released,
        vndbId: parsed.id,
        alias: meta.alias && meta.alias.length ? meta.alias : data.alias,
        tag: meta.tag && meta.tag.length ? meta.tag : data.tag,
        contentLimit,
        gameCG: downloaded,
        gameLink: newGameLink,
        developers: newDevelopers
      })

      toast.success('数据获取成功并已填入表单', { id: toastId })
      if (contentLimit === 'nsfw') {
        toast('该作品已标记为 NSFW，不会被公开索引')
      }
      onFetched()
    } catch (error) {
      console.error(error)
      toast.error(
        getKunFetchErrorMessage(error) ??
          (error instanceof Error && error.message
            ? error.message
            : '获取失败'),
        { id: toastId }
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-2">
      <h2 className="text-xl">VNDB ID (可选)</h2>
      <Input
        variant="underlined"
        labelPlacement="outside"
        placeholder="请输入 VNDB ID, 例如 v19658"
        value={data.vndbId}
        onChange={(e) => setData({ ...data, vndbId: e.target.value })}
        isInvalid={!!errors}
        errorMessage={errors}
      />
      <p className="text-sm ">
        提示: VNDB ID 需要 VNDB 官网 (vndb.org)
        获取，当进入对应游戏的页面，游戏页面的 URL (形如
        https://vndb.org/v19658) 中的 v19658 就是 VNDB ID
      </p>
      <p className="text-sm text-default-500">
        可不填。填写后点击获取并填入，字段从 NextMoe
        获取，中文优先，其次日文，最后英文。
      </p>
      <Link
        isExternal
        target="_blank"
        underline="hover"
        href="https://www.kungal.com/zh-cn/topic/1040"
        size="sm"
      >
        如何通过 VNDB 检索 Galgame?
      </Link>
      <div className="flex items-center text-sm">
        <Button
          color="primary"
          size="sm"
          isLoading={loading}
          onPress={handleFetch}
        >
          获取并填入
        </Button>
      </div>
    </div>
  )
}
