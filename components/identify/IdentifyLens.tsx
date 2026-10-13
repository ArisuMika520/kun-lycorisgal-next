'use client'

import { useRef, useState } from 'react'
import { Button } from '@heroui/react'
import { Spinner } from '@heroui/spinner'
import { ChevronDown, ImageIcon, Upload, X } from 'lucide-react'
import { cn } from '~/utils/cn'
import {
  boxFrame,
  detectionKey,
  firstClipboardFile,
  formatBytes,
  formatType,
  IMAGE_ACCEPT,
} from './shared'
import styles from './identify.module.css'

interface Props {
  file: File | null
  previewUrl: string | null
  imageUrl: string
  loading: boolean
  docked?: boolean
  characters: IdentifyCharacter[]
  activeIndex: number
  hoveredIndex: number | null
  onFile: (file: File) => void
  onImageUrlChange: (value: string) => void
  onClear: () => void
  onSubmit: () => void
  onFocusDetection: (index: number) => void
  onHoverDetection: (index: number | null) => void
}

export const IdentifyLens = ({
  file,
  previewUrl,
  imageUrl,
  loading,
  docked = false,
  characters,
  activeIndex,
  hoveredIndex,
  onFile,
  onImageUrlChange,
  onClear,
  onSubmit,
  onFocusDetection,
  onHoverDetection
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const emphasizedIndex = hoveredIndex ?? activeIndex
  const hasEmphasis = characters.length > 0 && emphasizedIndex !== null

  const openPicker = () => {
    if (loading) {
      return
    }
    inputRef.current?.click()
  }

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault()
    dragDepth.current += 1
    setIsDragging(true)
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    dragDepth.current -= 1
    window.requestAnimationFrame(() => {
      if (dragDepth.current <= 0) {
        dragDepth.current = 0
        setIsDragging(false)
      }
    })
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    const next = event.dataTransfer.files?.[0]
    if (next) {
      onFile(next)
    }
  }

  const handlePaste = (event: React.ClipboardEvent) => {
    const next = firstClipboardFile(event.clipboardData)
    if (!next) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    onFile(next)
  }

  return (
    <section
      aria-label="上传要识别的图片"
      className={cn(
        'relative w-full rounded-2xl border border-divider bg-content1 shadow-lg shadow-black/5'
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const next = event.target.files?.[0]
          if (next) {
            onFile(next)
          }
          event.target.value = ''
        }}
      />

      <div className="relative px-4 pb-1 pt-3.5 sm:px-5">
        <h2 className="px-8 text-center text-sm text-default-500">
          {docked
            ? '原图与角色标记'
            : previewUrl
              ? '识别这张截图'
              : '用截图识别角色与作品'}
        </h2>
        {previewUrl ? (
          <button
            type="button"
            aria-label="清除图片"
            className="absolute right-3 top-2.5 flex size-8 items-center justify-center rounded-full text-default-400 outline-none transition-colors hover:bg-default-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            onClick={onClear}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <div
          className={cn(
            'rounded-xl border transition-colors',
            docked ? 'p-2' : 'border-dashed px-4 py-4 sm:px-5 sm:py-5',
            isDragging
              ? 'border-primary bg-primary/5'
              : docked
                ? 'border-transparent'
                : 'border-default-400/70'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center',
              previewUrl ? 'min-h-0' : 'min-h-36 cursor-pointer'
            )}
            onClick={() => {
              if (!previewUrl) {
                openPicker()
              }
            }}
          >
            {previewUrl ? (
              <div className="relative inline-block max-w-full overflow-hidden rounded-lg bg-black/30">
                <img
                  src={previewUrl}
                  alt="待识别图片"
                  draggable={false}
                  className={cn(
                    'block max-w-full object-contain',
                    docked ? 'max-h-44 sm:max-h-56' : 'max-h-[min(22rem,46vh)]'
                  )}
                />
                {characters.map((character, index) => {
                  const emphasized = index === emphasizedIndex
                  return (
                    <button
                      key={detectionKey(character, index)}
                      type="button"
                      aria-label={`查看第 ${index + 1} 个检测结果`}
                      aria-pressed={index === activeIndex}
                      className={cn(
                        styles.detectionBox,
                        'absolute border-0 bg-transparent p-0 outline-none',
                        emphasized ? 'z-10 opacity-100' : 'hover:opacity-100',
                        hasEmphasis && !emphasized && 'opacity-40'
                      )}
                      style={boxFrame(character.box)}
                      onClick={() => onFocusDetection(index)}
                      onMouseEnter={() => onHoverDetection(index)}
                      onMouseLeave={() => onHoverDetection(null)}
                      onFocus={() => onHoverDetection(index)}
                      onBlur={() => onHoverDetection(null)}
                    >
                      {emphasized ? (
                        <span className={styles.frameShade} aria-hidden />
                      ) : null}
                      <span
                        className={cn(styles.frameCorner, styles.frameTl)}
                        aria-hidden
                      />
                      <span
                        className={cn(styles.frameCorner, styles.frameTr)}
                        aria-hidden
                      />
                      <span
                        className={cn(styles.frameCorner, styles.frameBl)}
                        aria-hidden
                      />
                      <span
                        className={cn(styles.frameCorner, styles.frameBr)}
                        aria-hidden
                      />
                    </button>
                  )
                })}
                {loading ? (
                  <div
                    className="absolute inset-0 z-20 overflow-hidden"
                    role="status"
                  >
                    <div className="absolute inset-0 bg-background/40" />
                    <div className={styles.scan} />
                    <div className="relative z-10 flex h-full items-center justify-center">
                      <div className="flex items-center gap-2 rounded-full bg-content1/95 px-4 py-2 text-sm shadow-sm">
                        <Spinner size="sm" color="primary" />
                        正在识别
                      </div>
                    </div>
                  </div>
                ) : null}
                {isDragging ? (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/75 text-sm font-medium text-primary">
                    松开以替换图片
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    isDragging
                      ? 'bg-primary/15 text-primary'
                      : 'bg-default-100 text-default-500'
                  )}
                >
                  {isDragging ? (
                    <Upload className="size-5" />
                  ) : (
                    <ImageIcon className="size-5" strokeWidth={1.75} />
                  )}
                </span>
                <p className="text-sm text-foreground">
                  {isDragging ? (
                    '松开以放入图片'
                  ) : (
                    <>
                      拖拽图片到这里，或{' '}
                      <button
                        type="button"
                        className="font-medium text-primary underline decoration-primary/40 underline-offset-4 outline-none hover:decoration-primary focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={(event) => {
                          event.stopPropagation()
                          openPicker()
                        }}
                      >
                        上传文件
                      </button>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          {previewUrl ? (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-default-400">
              <p className="min-w-0 truncate" title={file?.name ?? previewUrl}>
                {file
                  ? `${file.name} · ${formatType(file.type)} · ${formatBytes(file.size)}`
                  : previewUrl}
              </p>
              <button
                type="button"
                className="shrink-0 font-medium text-primary underline decoration-primary/40 underline-offset-4 outline-none hover:decoration-primary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                disabled={loading}
                onClick={openPicker}
              >
                更换
              </button>
            </div>
          ) : null}

          <details open={!docked} className={cn('group', docked && 'mt-4')}>
            <summary
              className={cn(
                'cursor-pointer list-none items-center justify-between rounded-lg bg-default-100 px-3 py-2.5 text-xs font-medium text-default-600 outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden',
                docked ? 'flex' : 'hidden'
              )}
            >
              换一张，继续识别
              <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
            </summary>
            <div
              aria-hidden
              className={cn('my-4 flex items-center gap-3', docked && 'hidden')}
            >
              <span className="h-px flex-1 bg-divider" />
              <span className="text-[11px] tracking-[0.2em] text-default-400">
                或
              </span>
              <span className="h-px flex-1 bg-divider" />
            </div>

            <form
              className={cn(
                'flex gap-2',
                docked ? 'mt-3 flex-col items-stretch' : 'items-center'
              )}
              onSubmit={(event) => {
                event.preventDefault()
                onSubmit()
              }}
            >
              <input
                type="url"
                inputMode="url"
                enterKeyHint="search"
                placeholder="输入图片链接"
                aria-label="图片链接"
                value={imageUrl}
                disabled={loading}
                className="h-11 min-h-11 min-w-0 w-full rounded-full bg-default-100 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-default-400 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                onChange={(event) => onImageUrlChange(event.target.value)}
              />
              <Button
                type="submit"
                color="primary"
                radius="full"
                className="h-11 min-w-[5.5rem] shrink-0 px-5 font-medium"
                isLoading={loading}
                isDisabled={loading || (!file && !imageUrl.trim())}
              >
                {docked ? '重新识别' : '识别'}
              </Button>
            </form>
          </details>
        </div>
      </div>
    </section>
  )
}
