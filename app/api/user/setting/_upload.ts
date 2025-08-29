import sharp from 'sharp'

import { uploadImageToS3, deleteFileFromS3 } from '~/lib/s3'
import { checkBufferSize } from '~/app/api/utils/checkBufferSize'

export const uploadUserAvatar = async (image: ArrayBuffer, uid: number) => {
  try {
    const avatar = await sharp(image)
      .resize(256, 256, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .avif({ quality: 60 })
      .toBuffer()
    const miniAvatar = await sharp(image)
      .resize(100, 100, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .avif({ quality: 50 })
      .toBuffer()

    if (!checkBufferSize(avatar, 1.007)) {
      return '图片体积过大'
    }

    // 使用时间戳确保文件名唯一性，避免缓存问题
    const timestamp = Date.now()
    const bucketName = `user/avatar/user_${uid}`

    // 先删除旧的头像文件，确保完全替换
    try {
      await deleteFileFromS3(`${bucketName}/avatar.avif`)
      await deleteFileFromS3(`${bucketName}/avatar-mini.avif`)
    } catch (error) {
      // 如果文件不存在，忽略删除错误
      console.log('旧头像文件不存在或删除失败，继续上传新文件')
    }

    await uploadImageToS3(`${bucketName}/avatar-${timestamp}.avif`, avatar)
    await uploadImageToS3(`${bucketName}/avatar-mini-${timestamp}.avif`, miniAvatar)
    return { success: true, timestamp }
  } catch (error) {
    console.error('头像处理或上传失败:', error)
    return '头像处理或上传失败'
  }
}
