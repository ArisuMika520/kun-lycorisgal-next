'use client'

import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, Input } from '@heroui/react'
import { useCreatePatchStore } from '~/store/editStore'
import { VNDBInput } from './VNDBInput'
import { AliasInput } from './AliasInput'
import { BannerImage } from './BannerImage'
import { PublishButton } from './PublishButton'
import { PatchIntroduction } from './PatchIntroduction'
import { ContentLimit } from './ContentLimit'
import { GameCGInput } from './GameCGInput'
import { GameLinkInput } from './GameLinkInput'
import { DeveloperInput } from './DeveloperInput'
import { BatchTag } from '../components/BatchTag'
import { ReleaseDateInput } from '../components/ReleaseDateInput'
import { loadGameCGFiles, saveGameCGFiles } from './persistGameCG'
import type { CreatePatchRequestData } from '~/store/editStore'

export const CreatePatch = () => {
  const { data, setData } = useCreatePatchStore()
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreatePatchRequestData, string>>
  >({})
  const [bannerKey, setBannerKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    let unsubscribeSave: (() => void) | undefined

    const revokePreviews = (items: { preview: string }[]) => {
      for (const item of items) URL.revokeObjectURL(item.preview)
    }

    const startSaving = () => {
      if (cancelled || unsubscribeSave) return
      unsubscribeSave = useCreatePatchStore.subscribe((state, previous) => {
        if (state.data.gameCG === previous.data.gameCG) return
        void saveGameCGFiles(state.data.gameCG)
      })
    }

    let started = false
    const restoreThenSubscribe = async () => {
      if (cancelled || started) return
      started = true

      const current = useCreatePatchStore.getState().data
      if ((current.gameCG ?? []).some((item) => typeof item !== 'string')) {
        startSaving()
        return
      }

      const restored = await loadGameCGFiles()
      if (cancelled) {
        revokePreviews(restored)
        return
      }

      const latest = useCreatePatchStore.getState().data
      if ((latest.gameCG ?? []).some((item) => typeof item !== 'string')) {
        revokePreviews(restored)
        void saveGameCGFiles(latest.gameCG)
      } else if (restored.length > 0) {
        useCreatePatchStore.getState().setData({
          ...latest,
          gameCG: [
            ...(latest.gameCG ?? []).filter((item) => typeof item === 'string'),
            ...restored
          ]
        })
      } else {
        revokePreviews(restored)
      }

      startSaving()
    }

    // Hydration stores no File entries. Subscribing before restore would
    // persist that empty list and wipe kun-patch-cgs.
    const persistApi = useCreatePatchStore.persist
    const unsubscribeHydration = persistApi.hasHydrated()
      ? undefined
      : persistApi.onFinishHydration(() => {
          void restoreThenSubscribe()
        })

    if (persistApi.hasHydrated()) {
      void restoreThenSubscribe()
    }

    return () => {
      cancelled = true
      unsubscribeHydration?.()
      unsubscribeSave?.()
    }
  }, [])

  return (
    <form className="w-full max-w-5xl py-4 mx-auto">
      <Card className="w-full">
        <CardHeader className="flex gap-3">
          <div className="flex flex-col">
            <h1 className="text-2xl">创建新游戏</h1>
          </div>
        </CardHeader>
        <CardBody className="mt-4 space-y-12">
          <VNDBInput
            errors={errors.vndbId}
            onFetched={() => setBannerKey((prev) => prev + 1)}
          />

          <div className="space-y-2">
            <h2 className="text-xl">游戏名称 (必须)</h2>
            <Input
              isRequired
              variant="underlined"
              labelPlacement="outside"
              placeholder="输入游戏名称, 这会作为游戏的标题"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              isInvalid={!!errors.name}
              errorMessage={errors.name}
            />
          </div>

          <BannerImage key={bannerKey} errors={errors.banner} />

          <PatchIntroduction errors={errors.banner} />

          <GameCGInput errors={errors.introduction} />

          <GameLinkInput errors={errors.introduction} />

          <AliasInput errors={errors.alias} />

          <ReleaseDateInput
            date={data.released}
            setDate={(date) => {
              setData({ ...data, released: date })
            }}
            errors={errors.released}
          />

          <DeveloperInput />

          <BatchTag
            initialTag={data.tag}
            saveTag={(tag) =>
              setData({
                ...data,
                tag
              })
            }
            errors={errors.tag}
          />

          <ContentLimit errors={errors.contentLimit} />

          <PublishButton setErrors={setErrors} />
        </CardBody>
      </Card>
    </form>
  )
}
