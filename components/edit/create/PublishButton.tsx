'use client'

import { useState } from 'react'
import {
  Button,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from '@heroui/react'
import localforage from 'localforage'
import { clearGameCGFiles } from './persistGameCG'
import { useCreatePatchStore } from '~/store/editStore'
import toast from 'react-hot-toast'
import {
  getKunFetchErrorMessage,
  KunFetchError,
  kunFetchFormData
} from '~/utils/kunFetch'
import { kunErrorHandler } from '~/utils/kunErrorHandler'
import { patchCreateSchema } from '~/validations/edit'
import { useRouter } from '@bprogress/next'
import type { Dispatch, SetStateAction } from 'react'
import type { CreatePatchRequestData } from '~/store/editStore'

interface Props {
  setErrors: Dispatch<
    SetStateAction<Partial<Record<keyof CreatePatchRequestData, string>>>
  >
}

interface PatchOverwriteConflict {
  error: string
  duplicate: {
    field: 'vndb_id' | 'dlsite_id'
    patch: {
      id: number
      uniqueId: string
      name: string
      created: string
      updated: string
    }
    summary: {
      hasBanner: boolean
      aliasCount: number
      tagCount: number
      companyCount: number
      resourceCount: number
      commentCount: number
      favoriteCount: number
    }
    canOverwrite: boolean
    overwriteReason?: string
  }
}

const getPatchOverwriteConflict = (
  error: unknown
): PatchOverwriteConflict | null => {
  if (!(error instanceof KunFetchError) || error.status !== 409) {
    return null
  }

  const body = error.responseBody
  if (!body || typeof body !== 'object' || !('duplicate' in body)) {
    return null
  }

  const duplicate = body.duplicate
  if (
    !duplicate ||
    typeof duplicate !== 'object' ||
    !('canOverwrite' in duplicate) ||
    duplicate.canOverwrite !== true
  ) {
    return null
  }

  return body as PatchOverwriteConflict
}

export const PublishButton = ({ setErrors }: Props) => {
  const router = useRouter()
  const { data, resetData } = useCreatePatchStore()

  const [creating, setCreating] = useState(false)
  const [overwriteConflict, setOverwriteConflict] =
    useState<PatchOverwriteConflict | null>(null)

  const handleSubmit = async (forceOverwrite = false) => {
    const localeBannerBlob: Blob | null =
      await localforage.getItem('kun-patch-banner')
    if (!localeBannerBlob) {
      toast.error('未检测到预览图片')
      return
    }

    const result = patchCreateSchema.safeParse({
      ...data,
      banner: localeBannerBlob,
      alias: JSON.stringify(data.alias),
      tag: JSON.stringify(data.tag),
      gameLinks: JSON.stringify(data.gameLink),
      developers: JSON.stringify(data.developers),
      gameCGUrls: JSON.stringify(
        data.gameCG.filter((i) => typeof i === 'string')
      )
    })
    if (!result.success) {
      const newErrors: Partial<Record<keyof CreatePatchRequestData, string>> =
        {}
      result.error.errors.forEach((err) => {
        if (err.path.length) {
          newErrors[err.path[0] as keyof CreatePatchRequestData] = err.message
          toast.error(err.message)
        }
      })
      setErrors(newErrors)
      return
    } else {
      setErrors({})
    }

    const formDataToSend = new FormData()
    formDataToSend.append('banner', localeBannerBlob!)
    formDataToSend.append('name', data.name)
    formDataToSend.append('vndbId', data.vndbId)
    formDataToSend.append('dlsiteId', data.dlsiteId)
    formDataToSend.append('introduction', data.introduction)
    formDataToSend.append('alias', JSON.stringify(data.alias))
    formDataToSend.append('tag', JSON.stringify(data.tag))
    formDataToSend.append('released', data.released)
    formDataToSend.append('contentLimit', data.contentLimit)

    const cgFiles: File[] = []
    const cgUrls: string[] = []

    data.gameCG.forEach((item) => {
      if (typeof item === 'string') {
        cgUrls.push(item)
      } else {
        cgFiles.push(item.file)
      }
    })

    cgFiles.forEach((file) => {
      formDataToSend.append('gameCGFiles', file)
    })
    formDataToSend.append('gameCGUrls', JSON.stringify(cgUrls))
    formDataToSend.append('gameLinks', JSON.stringify(data.gameLink))
    formDataToSend.append('developers', JSON.stringify(data.developers))
    if (forceOverwrite) {
      formDataToSend.append('forceOverwrite', 'true')
    }

    setCreating(true)
    toast('正在发布中 ... 这可能需要 10s 左右的时间, 这取决于您的网络环境')

    try {
      const res = await kunFetchFormData<
        KunResponse<{
          uniqueId: string
        }>
      >('/api/edit', formDataToSend)
      kunErrorHandler(res, async (value) => {
        for (const item of data.gameCG) {
          if (typeof item !== 'string') URL.revokeObjectURL(item.preview)
        }
        resetData()
        await localforage.removeItem('kun-patch-banner')
        await clearGameCGFiles()
        router.push(`/${value.uniqueId}`)
      })
      toast.success('发布完成, 正在为您跳转到资源介绍页面')
    } catch (error) {
      const conflict = getPatchOverwriteConflict(error)
      if (!forceOverwrite && conflict) {
        setOverwriteConflict(conflict)
        return
      }

      console.error('发布游戏失败:', error)
      toast.error(getKunFetchErrorMessage(error) ?? '发布失败，请稍后重试')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Button
        color="primary"
        onPress={() => {
          void handleSubmit()
        }}
        className="w-full mt-4"
        isDisabled={creating}
        isLoading={creating}
      >
        提交
      </Button>

      <Modal
        isOpen={!!overwriteConflict}
        onClose={() => setOverwriteConflict(null)}
        placement="center"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            检测到可覆盖的残留记录
          </ModalHeader>
          <ModalBody>
            {overwriteConflict && (
              <>
                <p>
                  检测到同一 ID 对应的记录「
                  {overwriteConflict.duplicate.patch.name}
                  」。
                </p>
                <p className="text-sm text-foreground/70">
                  {overwriteConflict.duplicate.overwriteReason}
                </p>
                <p className="text-sm text-foreground/70">
                  覆盖后会保留原游戏地址，并用当前表单内容替换它的基础信息、封面、别名、标签和会社。
                </p>
                <Link
                  isExternal
                  href={`/${overwriteConflict.duplicate.patch.uniqueId}`}
                  size="sm"
                >
                  查看现有记录: /{overwriteConflict.duplicate.patch.uniqueId}
                </Link>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setOverwriteConflict(null)}
              isDisabled={creating}
            >
              取消
            </Button>
            <Button
              color="warning"
              isLoading={creating}
              onPress={() => {
                setOverwriteConflict(null)
                void handleSubmit(true)
              }}
            >
              确认覆盖
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
