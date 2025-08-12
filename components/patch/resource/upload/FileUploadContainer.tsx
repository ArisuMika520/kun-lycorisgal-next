'use client'

import axios from 'axios'
import toast from 'react-hot-toast'
import { Dispatch, SetStateAction, useState } from 'react'
import { FileDropZone } from './FileDropZone'
import { FileUploadCard } from './FileUploadCard'
import { KunCaptchaModal } from '~/components/kun/auth/CaptchaModal'
import { useDisclosure } from '@heroui/modal'
import { useUserStore } from '~/store/userStore'
import type { KunUploadFileResponse } from '~/types/api/upload'
import type { FileStatus } from '../share'

interface Props {
  onSuccess: (
    storage: string,
    hash: string,
    content: string,
    size: string
  ) => void
  handleRemoveFile: () => void
  setUploadingResource: Dispatch<SetStateAction<boolean>>
}

export const FileUploadContainer = ({
  onSuccess,
  handleRemoveFile,
  setUploadingResource
}: Props) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const currentUserRole = useUserStore((state) => state.user.role)
  const [fileData, setFileData] = useState<FileStatus | null>(null)

  const handleCaptchaSuccess = async (
    code: string,
    fileToUpload?: File | null
  ) => {
    onClose()

    const fileForUpload = fileToUpload || fileData?.file

    if (!fileForUpload) {
      toast.error('未找到资源文件, 请重试')
      return
    }

    setUploadingResource(true)

    const formData = new FormData()
    formData.append('file', fileForUpload)
    formData.append('captcha', code)

    const res = await axios.post<KunUploadFileResponse | string>(
      '/api/upload/resource',
      formData,
      {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 0)
          )
          setFileData((prev) => (prev ? { ...prev, progress } : null))
        }
      }
    )

    if (typeof res.data === 'string') {
      setFileData(null)
      handleRemoveFile()
      toast.error(res.data)
      return
    }

    const { filetype, fileHash, fileSize } = res.data
    setFileData((prev) => (prev ? { ...prev, hash: fileHash, filetype } : null))
    onSuccess(
      filetype,
      fileHash,
      `${process.env.NEXT_PUBLIC_KUN_VISUAL_NOVEL_S3_STORAGE_URL}/${fileHash}`,
      fileSize
    )

    setUploadingResource(false)
  }

  const handleFileUpload = async (file: File) => {
    if (!file) {
      return
    }

    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > 100) {
      toast.error(
        `文件大小超出限制: ${fileSizeMB.toFixed(3)} MB, 最大允许大小为 100 MB`
      )
      return
    }

    setFileData({ file, progress: 0 })

    if (currentUserRole < 3) {
      onOpen()
    } else {
      await handleCaptchaSuccess('', file)
    }
  }

  const removeFile = () => {
    setFileData(null)
    handleRemoveFile()
  }

  const handleCaptureClose = () => {
    onClose()
    removeFile()
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">上传资源</h3>
      <p className="text-sm text-default-500">
        您的文件在上传后将会被去除特殊字符, 仅保留下划线 ( _ ) 或连字符 ( - ),
        以及后缀
      </p>

      <KunCaptchaModal
        isOpen={isOpen}
        onClose={handleCaptureClose}
        onSuccess={handleCaptchaSuccess}
      />

      {!fileData ? (
        <FileDropZone onFileUpload={handleFileUpload} />
      ) : (
        <FileUploadCard fileData={fileData} onRemove={removeFile} />
      )}
    </div>
  )
}
