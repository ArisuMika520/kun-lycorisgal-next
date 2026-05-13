import path from 'path'

export const sanitizeFileName = (fileName: string) => {
  // 先剥掉任何目录组件,防止类似 "../../etc/passwd" 或 Windows 反斜杠路径穿越
  const stripped = path.basename(fileName.replace(/\\/g, '/'))

  const match = stripped.match(/^(.*?)(\.[^.]+)?$/)
  if (!match) {
    return stripped
  }

  const baseName = match[1]
  const extension = match[2] || ''

  const sanitizedBaseName = baseName.replace(/[^\p{L}\p{N}_-]/gu, '')

  return `${sanitizedBaseName.slice(0, 100)}${extension}`
}
