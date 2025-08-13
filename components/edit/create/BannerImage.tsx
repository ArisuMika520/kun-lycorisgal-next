'use client'

import { useEffect, useState } from 'react'
import localforage from 'localforage'
import { dataURItoBlob } from '~/utils/dataURItoBlob'
import { KunImageCropper } from '~/components/kun/cropper/KunImageCropper'

interface Props {
  errors: string | undefined
}

export const BannerImage = ({ errors }: Props) => {
  const [initialUrl, setInitialUrl] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      const localeBannerBlob: Blob | null =
        await localforage.getItem('kun-patch-banner')
      if (localeBannerBlob) {
        setInitialUrl(URL.createObjectURL(localeBannerBlob))
      }
    }
    fetchData()
  }, [])

  const removeBanner = async () => {
    await localforage.removeItem('kun-patch-banner')
    setInitialUrl('')
  }

  const onImageComplete = async (croppedImage: string) => {
    const imageBlob = dataURItoBlob(croppedImage)
    await localforage.setItem('kun-patch-banner', imageBlob)
  }

  return (
    <div className="space-y-2">
      <h2 className="text-xl">封面图片 (必须)</h2>
      {errors && <p className="text-xs text-danger-500">{errors}</p>}

      <KunImageCropper
        aspect={{ x: 3, y: 4 }}
        initialImage={initialUrl}
        description="您的预览图片将会被固定为 3：4 分辨率"
        onImageComplete={onImageComplete}
        removeImage={removeBanner}
      />
    </div>
  )
}
