import { deleteFileFromS3, uploadFileToS3 } from '~/lib/s3'
import { getKv } from '~/lib/redis'

export const uploadPatchResource = async (patchId: number, hash: string) => {
  const filePath = await getKv(hash)
  if (!filePath) {
    return '本地临时文件存储未找到, 请重新上传文件'
  }
  const fileName = filePath.split('/').pop()
  const s3Key = `patch/${patchId}/resource/${hash}/${fileName}`
  await uploadFileToS3(s3Key, filePath)
  const downloadLink = `${process.env.NEXT_PUBLIC_KUN_VISUAL_NOVEL_S3_STORAGE_URL!}/${s3Key}`
  return { downloadLink }
}

export const deletePatchResource = async (
  content: string,
  id: number,
  hash: string
) => {
  const fileName = content.split('/').pop()
  const s3Key = `patch/${id}/${hash}/${fileName}`
  await deleteFileFromS3(s3Key)
}
