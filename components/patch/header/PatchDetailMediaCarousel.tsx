'use client'

import dynamic from 'next/dynamic'
import { startTransition, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '~/utils/cn'
import type { PatchDetailPreviewImage } from './types'
import styles from './patch-detail.module.css'

const PatchDetailLightbox = dynamic(
  () => import('./PatchDetailLightbox').then((mod) => mod.PatchDetailLightbox),
  { ssr: false }
)

interface Props {
  images: PatchDetailPreviewImage[]
  name: string
  editor?: ReactNode
}

const ExpandIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
    <path
      d="M3.5 8V3.5H8M12 3.5h4.5V8M16.5 12v4.5H12M8 16.5H3.5V12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const PatchDetailMediaCarousel = ({ images, name, editor }: Props) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [hasOpenedLightbox, setHasOpenedLightbox] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([])

  const safeActiveIndex = images.length
    ? Math.min(activeIndex, images.length - 1)
    : 0
  const activeImage = images[safeActiveIndex]

  useEffect(() => {
    const scroller = scrollerRef.current
    const thumb = thumbRefs.current[safeActiveIndex]
    if (!scroller || !thumb) {
      return
    }

    const scrollerRect = scroller.getBoundingClientRect()
    const thumbRect = thumb.getBoundingClientRect()
    if (
      thumbRect.left >= scrollerRect.left &&
      thumbRect.right <= scrollerRect.right
    ) {
      return
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    scroller.scrollTo({
      left: Math.max(
        0,
        scroller.scrollLeft + (thumbRect.left - scrollerRect.left) - 16
      ),
      behavior: reducedMotion ? 'auto' : 'smooth'
    })
  }, [safeActiveIndex])

  const openLightbox = (index: number) => {
    startTransition(() => {
      setHasOpenedLightbox(true)
      setLightboxIndex(index)
    })
  }

  const goPrev = () => {
    setActiveIndex((prev) => (prev <= 0 ? images.length - 1 : prev - 1))
  }

  const goNext = () => {
    setActiveIndex((prev) => (prev >= images.length - 1 ? 0 : prev + 1))
  }

  if (!images.length || !activeImage) {
    return (
      <div className={styles.stageEmpty}>
        {editor}
        <p>当前条目暂无可预览图片。</p>
      </div>
    )
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.stage}>
        <button
          type="button"
          className={styles.stageButton}
          onClick={() => openLightbox(safeActiveIndex)}
          aria-label="放大查看"
        >
          <img
            src={activeImage.src}
            alt={activeImage.alt || `${name} 预览图 ${safeActiveIndex + 1}`}
            loading={safeActiveIndex === 0 ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={safeActiveIndex === 0 ? 'high' : 'auto'}
          />
        </button>
        <button
          type="button"
          className={styles.expand}
          onClick={() => openLightbox(safeActiveIndex)}
          aria-label="全屏查看"
        >
          <ExpandIcon />
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              className={`${styles.stageNav} ${styles.stageNavPrev}`}
              onClick={goPrev}
              aria-label="查看上一张"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              className={`${styles.stageNav} ${styles.stageNavNext}`}
              onClick={goNext}
              aria-label="查看下一张"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
        {editor}
      </div>

      {images.length > 1 && (
        <div className={styles.thumbRow}>
          <button
            type="button"
            className={styles.chevron}
            onClick={goPrev}
            aria-label="查看上一张"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className={styles.thumbScroller} ref={scrollerRef}>
            {images.map((item, index) => (
              <button
                key={`${item.src}-${index}`}
                ref={(node) => {
                  thumbRefs.current[index] = node
                }}
                type="button"
                className={cn(
                  styles.thumb,
                  index === safeActiveIndex && styles.thumbActive
                )}
                onClick={() => setActiveIndex(index)}
                aria-label={`预览图片 ${index + 1}`}
                aria-current={index === safeActiveIndex ? 'true' : undefined}
              >
                <img
                  src={item.src}
                  alt={item.alt || `${name} 缩略图 ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.chevron}
            onClick={goNext}
            aria-label="查看下一张"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {hasOpenedLightbox && (
        <PatchDetailLightbox
          images={images}
          index={lightboxIndex}
          open={lightboxIndex >= 0}
          onClose={() => setLightboxIndex(-1)}
        />
      )}
    </div>
  )
}
