export const ALLOWED_TYPES: Record<string, true> = {
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  'image/webp': true,
  'image/gif': true
}

export const MAX_BYTES = 8 * 1024 * 1024

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

const TYPE_LABEL: Record<string, string> = {
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF'
}

export const TONE_INK = '#1c0b11'

export type DetectionTone = {
  border: string
  fill: string
}

const TONES: DetectionTone[] = [
  { border: '#f791a9', fill: 'rgba(247, 145, 169, 0.28)' },
  { border: '#a78bfa', fill: 'rgba(167, 139, 250, 0.28)' },
  { border: '#38bdf8', fill: 'rgba(56, 189, 248, 0.28)' },
  { border: '#34d399', fill: 'rgba(52, 211, 153, 0.28)' },
  { border: '#fbbf24', fill: 'rgba(251, 191, 36, 0.32)' },
  { border: '#fb923c', fill: 'rgba(251, 146, 60, 0.28)' }
]

export const detectionTone = (index: number) => TONES[index % TONES.length]

export const detectionKey = (character: IdentifyCharacter, index: number) =>
  character.boxId || String(index)

export const detectionLabel = (character: IdentifyCharacter, index: number) =>
  character.candidates[0]?.character ||
  character.candidates[0]?.work ||
  `检测 ${index + 1}`

export const firstClipboardFile = (data: DataTransfer): File | null => {
  const pasted = data.files?.[0]
  if (pasted) {
    return pasted
  }
  const items = data.items
  if (!items) {
    return null
  }
  for (const item of items) {
    if (item.kind !== 'file') {
      continue
    }
    const next = item.getAsFile()
    if (next) {
      return next
    }
  }
  return null
}

export const formatBytes = (size: number) => {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export const formatType = (type: string) => TYPE_LABEL[type] ?? '图片'

export const webSearchHref = (work: string) =>
  `https://www.bing.com/search?q=${encodeURIComponent(work.trim())}`
export const boxFrame = (box: IdentifyCharacter['box']) => {
  const [x1, y1, x2, y2] = box
  return {
    left: `${Math.min(x1, x2) * 100}%`,
    top: `${Math.min(y1, y2) * 100}%`,
    width: `${Math.abs(x2 - x1) * 100}%`,
    height: `${Math.abs(y2 - y1) * 100}%`
  }
}

export const cropDetection = (url: string, box: IdentifyCharacter['box']) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const [x1, y1, x2, y2] = box
      const sx = Math.max(0, Math.min(x1, x2)) * image.naturalWidth
      const sy = Math.max(0, Math.min(y1, y2)) * image.naturalHeight
      const sw = Math.max(1, Math.abs(x2 - x1) * image.naturalWidth)
      const sh = Math.max(1, Math.abs(y2 - y1) * image.naturalHeight)
      const canvas = document.createElement('canvas')
      const side = 240
      canvas.width = side
      canvas.height = side
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('canvas'))
        return
      }
      const scale = Math.max(side / sw, side / sh)
      const dw = sw * scale
      const dh = sh * scale
      context.drawImage(
        image,
        sx,
        sy,
        sw,
        sh,
        (side - dw) / 2,
        (side - dh) / 2,
        dw,
        dh
      )
      resolve(canvas.toDataURL('image/jpeg', 0.86))
    }
    image.onerror = () => reject(new Error('image'))
    image.src = url
  })
