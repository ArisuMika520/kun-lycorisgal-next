import { z } from 'zod'
import { getKv, setKv } from '~/lib/redis'

const MODEL_LIST_URL = 'https://api.animetrace.com/v1/model/list'
const SEARCH_URL = 'https://api.animetrace.com/v1/search'
const MODEL_CACHE_KEY = 'animetrace:model'
const MODEL_CACHE_TTL = 3600

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

const UPSTREAM_FAIL = {
  status: 502,
  error: '识别服务暂时无法完成，请重试'
} as const

const CODE_ERROR: Record<number, { status: number; error: string }> = {
  17701: { status: 413, error: '图片过大，请压缩到 8MB 以内' },
  17705: {
    status: 400,
    error: '图片格式不支持，请使用 JPG、PNG、WEBP 或 GIF'
  },
  17702: { status: 503, error: '识别服务繁忙，请稍后重试' },
  17731: { status: 503, error: '识别服务繁忙，请稍后重试' },
  17704: { status: 503, error: '识别服务维护中' },
  17728: { status: 429, error: 'AnimeTrace 识别次数已达上限' },
  17708: { status: 400, error: '图片中的人物过多' }
}

const boxSchema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite()
])

const candidateSchema = z.object({
  work: z.string(),
  character: z.string()
})

const detectionSchema = z.object({
  box: z.unknown(),
  box_id: z.string().optional(),
  not_confident: z.boolean().optional(),
  character: z.array(z.unknown()).optional()
})

const searchSchema = z.object({
  code: z.number(),
  ai: z.boolean().optional(),
  trace_id: z.string().optional(),
  data: z.unknown().optional()
})

const modelListSchema = z.object({
  code: z.number(),
  data: z
    .array(
      z.object({
        id: z.string(),
        enabled: z.boolean().optional(),
        default: z.boolean().optional()
      })
    )
    .optional()
})

export interface TraceCharacter {
  box: [number, number, number, number]
  boxId: string
  notConfident: boolean
  candidates: { work: string; character: string }[]
}

export type TraceResult =
  | {
      ok: true
      ai: boolean
      traceId: string
      model: string
      characters: TraceCharacter[]
    }
  | { ok: false; status: number; error: string }

const readJson = async (res: Response): Promise<unknown | null> => {
  if (res.status >= 300 && res.status < 400) {
    return null
  }
  try {
    return await res.json()
  } catch {
    return null
  }
}

const resolveModelId = async (): Promise<string | undefined> => {
  try {
    const cached = await getKv(MODEL_CACHE_KEY)
    if (typeof cached === 'string' && cached.length > 0) {
      return cached
    }
  } catch {
    // A cache read failure is a miss, not a recognition failure.
  }

  try {
    const res = await fetch(MODEL_LIST_URL, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok || res.status >= 300) {
      return undefined
    }
    const parsed = modelListSchema.safeParse(await readJson(res))
    if (!parsed.success || parsed.data.code !== 0) {
      return undefined
    }
    const models = (parsed.data.data ?? []).filter((model) => model.id)
    const modelId =
      models.find((model) => model.enabled && model.default)?.id ??
      models.find((model) => model.enabled)?.id
    if (!modelId) {
      return undefined
    }
    try {
      await setKv(MODEL_CACHE_KEY, modelId, MODEL_CACHE_TTL)
    } catch {
      // A cache write failure must not block recognition.
    }
    return modelId
  } catch {
    return undefined
  }
}

export const searchAnimeTrace = async (
  bytes: ArrayBuffer,
  mime: string
): Promise<TraceResult> => {
  const ext = MIME_EXT[mime]
  if (!ext) {
    return {
      ok: false,
      status: 400,
      error: '图片格式不支持，请使用 JPG、PNG、WEBP 或 GIF'
    }
  }

  const model = await resolveModelId()
  const form = new FormData()
  form.append('is_multi', '1')
  form.append('ai_detect', '1')
  if (model) {
    form.append('model', model)
  }
  form.append('file', new Blob([bytes], { type: mime }), `image.${ext}`)

  let res: Response
  try {
    res = await fetch(SEARCH_URL, {
      method: 'POST',
      body: form,
      redirect: 'manual',
      signal: AbortSignal.timeout(25000)
    })
  } catch {
    return { ok: false, ...UPSTREAM_FAIL }
  }

  const parsed = searchSchema.safeParse(await readJson(res))
  if (!parsed.success) {
    return { ok: false, ...UPSTREAM_FAIL }
  }

  if (parsed.data.code !== 0 && parsed.data.code !== 17720) {
    return { ok: false, ...(CODE_ERROR[parsed.data.code] ?? UPSTREAM_FAIL) }
  }

  const characters: TraceCharacter[] = []
  for (const item of Array.isArray(parsed.data.data) ? parsed.data.data : []) {
    if (characters.length >= 8) {
      break
    }
    const detection = detectionSchema.safeParse(item)
    if (!detection.success) {
      continue
    }
    const box = boxSchema.safeParse(detection.data.box)
    if (!box.success) {
      continue
    }
    const candidates: { work: string; character: string }[] = []
    for (const raw of detection.data.character ?? []) {
      if (candidates.length >= 5) {
        break
      }
      const candidate = candidateSchema.safeParse(raw)
      if (!candidate.success) {
        continue
      }
      candidates.push(candidate.data)
    }
    characters.push({
      box: box.data,
      boxId: detection.data.box_id ?? '',
      notConfident: detection.data.not_confident === true,
      candidates
    })
  }

  return {
    ok: true,
    ai: parsed.data.ai === true,
    traceId: parsed.data.trace_id ?? '',
    model: model ?? '',
    characters
  }
}
