import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { kunParseFormData } from '~/app/api/utils/parseQuery'
import { searchAnimeTrace } from './animetrace'
import { fetchIdentifyImage } from './fetchImage'
import { matchIdentifyWorks } from './matchWorks'
import { getNSFWHeader } from '~/app/api/utils/getNSFWHeader'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const ALLOWED_TYPES: Record<string, true> = {
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  'image/webp': true,
  'image/gif': true
}

const identifySchema = z
  .object({
    file: z.custom<File>((value) => value instanceof File).optional(),
    url: z.string().trim().optional()
  })
  .refine((value) => value.file instanceof File || Boolean(value.url), {
    message: '请上传图片或输入图片链接'
  })

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status })

export const POST = async (req: NextRequest) => {
  let input: z.infer<typeof identifySchema> | string
  try {
    input = await kunParseFormData(req, identifySchema)
  } catch {
    return fail('请上传图片或输入图片链接', 400)
  }
  if (typeof input === 'string') {
    return fail('请上传图片或输入图片链接', 400)
  }

  const url = input.url?.trim()
  let bytes: ArrayBuffer
  let mime: string
  if (url) {
    const fetched = await fetchIdentifyImage(url)
    if (!fetched.ok) {
      return fail(fetched.error, fetched.status)
    }
    bytes = fetched.bytes
    mime = fetched.mime
  } else if (input.file) {
    const { file } = input
    if (file.size <= 0) {
      return fail('图片为空', 400)
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return fail('图片过大，请压缩到 8MB 以内', 413)
    }
    if (!ALLOWED_TYPES[file.type]) {
      return fail('图片格式不支持，请使用 JPG、PNG、WEBP 或 GIF', 400)
    }
    bytes = await file.arrayBuffer()
    mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type
  } else {
    return fail('请上传图片或输入图片链接', 400)
  }

  const traced = await searchAnimeTrace(bytes, mime)
  if (!traced.ok) {
    return fail(traced.error, traced.status)
  }

  let works: IdentifyWorkMatch[] = []
  let workSearchFailed = false
  try {
    works = await matchIdentifyWorks(traced.characters, getNSFWHeader(req))
  } catch {
    workSearchFailed = true
  }

  const result: IdentifyResult = {
    ai: traced.ai,
    traceId: traced.traceId,
    model: traced.model,
    characters: traced.characters,
    works,
    workSearchFailed
  }

  return NextResponse.json(result)
}
