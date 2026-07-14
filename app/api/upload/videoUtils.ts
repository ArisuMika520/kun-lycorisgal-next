import { createWriteStream, existsSync } from 'fs'
import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import path from 'path'
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'videos')

const assertSafeFileId = (fileId: string) => {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(fileId)) {
    throw new Error('Invalid file id')
  }
}

const assertSafeChunkIndex = (chunkIndex: number) => {
  if (!Number.isSafeInteger(chunkIndex) || chunkIndex < 0) {
    throw new Error('Invalid chunk index')
  }
}

const sanitizeVideoFileName = (fileName: string) => {
  const normalized = fileName.replace(/\\/g, '/')
  const basename = path.posix.basename(normalized)
  if (!basename || basename === '.' || basename === '..') {
    throw new Error('Invalid file name')
  }
  return basename
}

export const ensureUploadDir = async () => {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export const writeChunk = async (
  fileId: string,
  chunkData: Buffer,
  chunkIndex: number
) => {
  assertSafeFileId(fileId)
  assertSafeChunkIndex(chunkIndex)
  await ensureUploadDir()
  const chunkPath = path.join(UPLOAD_DIR, `${fileId}-${chunkIndex}`)
  await writeFile(chunkPath, chunkData)
  return chunkPath
}

export const mergeChunks = async (
  fileId: string,
  totalChunks: number,
  fileName: string
) => {
  assertSafeFileId(fileId)
  assertSafeChunkIndex(totalChunks)
  await ensureUploadDir()
  const finalPath = path.join(UPLOAD_DIR, sanitizeVideoFileName(fileName))
  const writeStream = createWriteStream(finalPath)

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(UPLOAD_DIR, `${fileId}-${i}`)
    const chunkBuffer = await readFile(chunkPath)
    writeStream.write(chunkBuffer)
    await unlink(chunkPath)
  }

  return new Promise<string>((resolve, reject) => {
    writeStream.on('finish', () => resolve(finalPath))
    writeStream.on('error', reject)
    writeStream.end()
  })
}

export const cleanupChunks = async (fileId: string, totalChunks: number) => {
  assertSafeFileId(fileId)
  assertSafeChunkIndex(totalChunks)
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(UPLOAD_DIR, `${fileId}-${i}`)
    if (existsSync(chunkPath)) {
      await unlink(chunkPath)
    }
  }
}
