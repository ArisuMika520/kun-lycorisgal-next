import sharp from 'sharp'

import { uploadImageToS3 } from '~/lib/s3'
import { checkBufferSize } from '~/app/api/utils/checkBufferSize'

export const uploadPatchBanner = async (image: ArrayBuffer, id: number) => {
  try {
    const banner = await sharp(image)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .avif({ quality: 60 })
      .toBuffer()
    const miniBanner = await sharp(image)
      .resize(460, 259, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .avif({ quality: 60 })
      .toBuffer()

    if (!checkBufferSize(miniBanner, 1.007)) {
      return '图片体积过大'
    }

    const bucketName = `patch/${id}/banner`

    await uploadImageToS3(`${bucketName}/banner.avif`, banner)
    await uploadImageToS3(`${bucketName}/banner-mini.avif`, miniBanner)

    return { success: true }
  } catch (error) {
    console.error('Error uploading patch banner:', error)
    return '图片上传失败'
  }
}

export const uploadPatchImages = async (images: ArrayBuffer[], id: number) => {
  const urls: string[] = []
  try {
    const bucketName = `patch/${id}/images`

    await Promise.all(images.map(async (img, index) => {
      const processed = await sharp(img)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .avif({ quality: 70 })
        .toBuffer()

      const filename = `${Date.now()}-${index}.avif`
      const key = `${bucketName}/${filename}`

      await uploadImageToS3(key, processed)
      urls.push(`${process.env.KUN_VISUAL_NOVEL_IMAGE_BED_URL}/${key}`)
    }))

    return urls
  } catch (error) {
    console.error('Error uploading patch images:', error)
    return []
  }
}
