'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { kunMoyuMoe } from '~/config/moyu-moe'
import { getKunFetchErrorMessage, kunFetchFormData } from '~/utils/kunFetch'
import { cn } from '~/utils/cn'
import { IdentifyLens } from './IdentifyLens'
import { IdentifyMatches } from './IdentifyMatches'
import {
  ALLOWED_TYPES,
  cropDetection,
  detectionKey,
  firstClipboardFile,
  MAX_BYTES
} from './shared'

export const IdentifyPage = () => {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IdentifyResult | null>(null)
  const [crops, setCrops] = useState<Record<string, string>>({})
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const previewRef = useRef<string | null>(null)
  const acceptFileRef = useRef<(next: File) => void>(() => {})
  const requestSeq = useRef(0)
  const resultsRef = useRef<HTMLDivElement | null>(null)
  const reduceMotion = useReducedMotion()

  const clearBlob = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current)
      previewRef.current = null
    }
  }

  const resetResult = () => {
    setResult(null)
    setCrops({})
    setActiveIndex(0)
    setHoveredIndex(null)
  }

  const replacePreview = (next: File | null) => {
    requestSeq.current += 1
    setLoading(false)
    clearBlob()
    setFile(next)
    resetResult()
    if (!next) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(next)
    previewRef.current = url
    setPreviewUrl(url)
  }

  const acceptFile = (next: File) => {
    if (!ALLOWED_TYPES[next.type]) {
      toast.error('图片格式不支持，请使用 JPG、PNG、WEBP 或 GIF')
      return
    }
    if (next.size > MAX_BYTES) {
      toast.error('图片过大，请压缩到 8MB 以内')
      return
    }
    setImageUrl('')
    replacePreview(next)
  }

  acceptFileRef.current = acceptFile

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const data = event.clipboardData
      if (!data) {
        return
      }
      const next = firstClipboardFile(data)
      if (!next || !ALLOWED_TYPES[next.type]) {
        return
      }
      event.preventDefault()
      acceptFileRef.current(next)
    }
    document.addEventListener('paste', onPaste)
    return () => {
      document.removeEventListener('paste', onPaste)
      requestSeq.current += 1
      clearBlob()
    }
  }, [])

  const focusDetection = (index: number) => {
    setActiveIndex(index)
    const card = resultsRef.current?.querySelector<HTMLButtonElement>(
      `[data-detection-index="${index}"]`
    )
    card?.focus({ preventScroll: true })
    card?.scrollIntoView({
      behavior: reduceMotion ? 'instant' : 'smooth',
      block: 'nearest'
    })
  }

  const identify = async (formData: FormData) => {
    const id = ++requestSeq.current
    setLoading(true)
    try {
      const res = await kunFetchFormData<IdentifyResult>(
        '/api/identify',
        formData
      )
      if (id !== requestSeq.current) {
        return
      }
      setResult(res)
      setCrops({})
      setActiveIndex(0)
      setHoveredIndex(null)
      setLoading(false)
      const url = previewRef.current
      if (!url) {
        return
      }
      const nextCrops: Record<string, string> = {}
      await Promise.all(
        res.characters.map(async (character, index) => {
          const key = detectionKey(character, index)
          try {
            nextCrops[key] = await cropDetection(url, character.box)
          } catch {
            // A failed crop still leaves the full preview and boxes.
          }
        })
      )
      if (id !== requestSeq.current) {
        return
      }
      setCrops(nextCrops)
    } catch (error) {
      if (id !== requestSeq.current) {
        return
      }
      toast.error(getKunFetchErrorMessage(error) ?? '识别失败，请重试')
    } finally {
      if (id === requestSeq.current) {
        setLoading(false)
      }
    }
  }

  const handleSubmit = async () => {
    if (loading) {
      return
    }
    const remote = imageUrl.trim()
    if (remote) {
      let parsed: URL
      try {
        parsed = new URL(remote)
      } catch {
        toast.error('图片链接无效')
        return
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        toast.error('只支持 http 或 https 图片链接')
        return
      }
      requestSeq.current += 1
      clearBlob()
      setFile(null)
      if (previewUrl !== parsed.toString()) resetResult()
      setPreviewUrl(parsed.toString())
      const formData = new FormData()
      formData.append('url', parsed.toString())
      await identify(formData)
      return
    }
    if (!file) {
      toast.error('请上传、粘贴图片，或输入图片链接')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    await identify(formData)
  }

  const docked = Boolean(result)
  const lens = (
    <IdentifyLens
      file={file}
      previewUrl={previewUrl}
      imageUrl={imageUrl}
      loading={loading}
      docked={docked}
      characters={result?.characters ?? []}
      activeIndex={activeIndex}
      hoveredIndex={hoveredIndex}
      onFile={acceptFile}
      onImageUrlChange={setImageUrl}
      onClear={() => {
        setImageUrl('')
        replacePreview(null)
      }}
      onSubmit={handleSubmit}
      onFocusDetection={focusDetection}
      onHoverDetection={setHoveredIndex}
    />
  )

  return (
    <div
      className={cn(
        'mx-auto w-full py-6 sm:py-10',
        docked
          ? 'max-w-none'
          : 'flex min-h-[calc(100dvh-11rem)] max-w-[40rem] flex-col justify-center'
      )}
    >
      <div
        className={cn(
          'grid items-start gap-6 lg:gap-8',
          docked && 'lg:grid-cols-[19rem_minmax(0,1fr)]'
        )}
      >
        <motion.div
          layout={reduceMotion ? false : 'position'}
          transition={{ layout: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }}
          className={cn('min-w-0', docked && 'lg:sticky lg:top-6')}
        >
          <header
            className={cn(
              'flex items-center gap-3',
              docked ? 'mb-4' : 'mb-7 justify-center'
            )}
          >
            <Image
              src="/favicon.webp"
              alt=""
              width={docked ? 36 : 48}
              height={docked ? 36 : 48}
              priority
              className="shrink-0"
            />
            <h1
              className={cn(
                'font-bold tracking-tight text-foreground',
                docked ? 'text-xl' : 'text-3xl sm:text-4xl'
              )}
            >
              {kunMoyuMoe.creator.name}
            </h1>
          </header>
          {lens}
          <p
            className={cn(
              'mt-4 text-xs leading-relaxed text-default-400',
              !docked && 'text-center'
            )}
          >
            {docked
              ? '点击图片中的标记，查看角色对应的作品。'
              : '在页面按 Ctrl+V 粘贴图片。JPG · PNG · WEBP · GIF，最大 8MB。'}
            <span className="mt-1 block">图片仅用于识别，不会保存到图床。</span>
          </p>
        </motion.div>
        {result ? (
          <motion.div
            ref={resultsRef}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.32,
              delay: reduceMotion ? 0 : 0.12
            }}
            className="min-w-0 scroll-mt-6"
          >
            <IdentifyMatches
              result={result}
              crops={crops}
              loading={loading}
              activeIndex={activeIndex}
              hoveredIndex={hoveredIndex}
              onFocus={setActiveIndex}
              onHover={setHoveredIndex}
            />
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}
