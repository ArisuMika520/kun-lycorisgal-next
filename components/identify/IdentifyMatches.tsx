'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  ScanFace,
  Search,
  TriangleAlert
} from 'lucide-react'
import { GalgameCard } from '~/components/galgame/Card'
import { cn } from '~/utils/cn'
import { detectionKey, webSearchHref } from './shared'
import styles from './identify.module.css'

interface Props {
  result: IdentifyResult
  crops: Record<string, string>
  loading: boolean
  activeIndex: number
  hoveredIndex: number | null
  onFocus: (index: number) => void
  onHover: (index: number | null) => void
}

export const IdentifyMatches = ({
  result,
  crops,
  loading,
  activeIndex,
  hoveredIndex,
  onFocus,
  onHover
}: Props) => {
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const byWork = useMemo(
    () =>
      new Map(result.works.map((item) => [item.work.trim(), item.galgames])),
    [result.works]
  )
  const detection = result.characters[activeIndex]
  const works = [
    ...new Set(
      detection?.candidates
        .map((candidate) => candidate.work.trim())
        .filter(Boolean) ?? []
    )
  ]
  const cards = [
    ...new Map(
      works
        .flatMap((work) => byWork.get(work) ?? [])
        .map((card) => [card.id, card])
    ).values()
  ]
  const totalCards = new Set(
    result.works.flatMap((work) => work.galgames.map((card) => card.id))
  ).size

  useEffect(() => {
    setCopied(false)
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
    }
  }, [result])

  const copyTrace = async () => {
    if (!result.traceId) return
    try {
      await navigator.clipboard.writeText(result.traceId)
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <section
      aria-label="识别结果"
      className={cn(
        'min-w-0 space-y-5 transition-opacity',
        loading && 'opacity-60'
      )}
      aria-busy={loading}
    >
      <header className="flex items-center gap-3">
        {loading ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-default-200 text-foreground">
            <ScanFace className="size-4" strokeWidth={2} />
          </span>
        ) : (
          <CheckCircle2
            className="size-8 shrink-0 text-success-500"
            strokeWidth={2}
          />
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold">
            {loading ? '正在重新识别' : '识别完成'}
          </h2>
          <p className="mt-0.5 text-sm text-default-500" role="status">
            检测到 {result.characters.length} 个角色
            <span className="mx-2 text-default-300">/</span>
            {result.workSearchFailed
              ? '站内检索暂不可用'
              : `找到 ${totalCards} 部可能的作品`}
          </p>
        </div>
      </header>

      {result.ai ? (
        <div className="flex items-start gap-2 rounded-xl bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>这张图可能由 AI 生成，识别结果仅供参考。</p>
        </div>
      ) : null}

      {result.characters.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <h3 className="text-sm font-medium">图片中的角色</h3>
            <p className="text-xs text-default-400">
              选择角色或图片标记，查看对应作品
            </p>
          </div>
          <div
            className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
            aria-label="选择检测角色"
          >
            {result.characters.map((character, index) => {
              const key = detectionKey(character, index)
              const top = character.candidates[0]
              const active = index === activeIndex
              const hovered = index === hoveredIndex
              return (
                <button
                  key={key}
                  type="button"
                  data-detection-index={index}
                  aria-pressed={active}
                  aria-controls="identify-work-results"
                  className={cn(
                    'flex min-w-0 items-center gap-3 rounded-lg bg-default-100 px-3 py-2.5 text-left text-foreground outline-none transition-colors',
                    'hover:bg-default-200 focus-visible:ring-2 focus-visible:ring-foreground',
                    (active || hovered) && 'bg-default-200'
                  )}
                  onMouseEnter={() => onHover(index)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(index)}
                  onBlur={() => onHover(null)}
                  onClick={() => onFocus(index)}
                >
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-default-200">
                    {crops[key] ? (
                      <img
                        src={crops[key]}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-default-500">
                        <ScanFace className="size-5" strokeWidth={1.75} />
                      </span>
                    )}
                    <span className="absolute bottom-0 left-0 flex size-5 items-center justify-center bg-foreground text-[10px] font-bold text-background">
                      {index + 1}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-sm font-medium"
                      title={top?.character}
                    >
                      {top?.character || '未知角色'}
                    </span>
                    <span
                      className="mt-0.5 block truncate text-xs text-default-500"
                      title={top?.work}
                    >
                      {top?.work || '未知作品'}
                    </span>
                    {character.notConfident ? (
                      <span className="mt-1 block text-[11px] text-default-400">
                        置信度较低，请核对作品
                      </span>
                    ) : null}
                  </span>
                  {active ? (
                    <Check
                      className="size-4 shrink-0 text-foreground"
                      strokeWidth={2.5}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {detection ? (
        <div
          id="identify-work-results"
          key={`${activeIndex}-${result.traceId}`}
          className={cn(styles.resultPanel, 'space-y-5')}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <h3 className="font-semibold">
                可能的作品{cards.length > 0 ? ` · ${cards.length}` : ''}
              </h3>
              <p className="text-xs text-default-400">
                可能包含同系列作品，请核对封面、副标题与版本
              </p>
            </div>
            {cards.length > 0 ? (
              <div className="grid w-2/3 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {cards.map((patch, index) => (
                  <div
                    key={patch.id}
                    className={cn(
                      styles.resultCard,
                      'min-w-0 [&>a]:h-full [&>a]:w-full'
                    )}
                    style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
                  >
                    <GalgameCard patch={patch} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-divider bg-default-50/50 p-5">
                <Search className="mt-0.5 size-5 shrink-0 text-default-400" />
                <div>
                  <p className="text-sm font-medium">
                    {result.workSearchFailed
                      ? '站内检索暂时不可用'
                      : '暂未找到站内匹配'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-default-500">
                    {works.length
                      ? '可以用下方识别出的作品名在 Bing 继续查找。'
                      : '没有识别出作品名，试试角色更清晰的截图。'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {works.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-divider bg-content1">
              <div className="flex flex-wrap items-baseline justify-between gap-1 border-b border-divider bg-default-50/50 px-4 py-3">
                <h3 className="text-sm font-medium">识别出的作品名</h3>
                <span className="text-xs text-default-400">
                  仅使用作品名搜索
                </span>
              </div>
              <ul className="divide-y divide-divider">
                {works.map((work) => (
                  <li key={work} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">{work}</p>
                      <p className="mt-1 text-xs text-default-400">
                        {result.workSearchFailed
                          ? '站内检索暂不可用'
                          : byWork.get(work)?.length
                            ? `站内有 ${byWork.get(work)!.length} 个相似结果`
                            : '暂无站内匹配'}
                      </p>
                    </div>
                    <a
                      href={webSearchHref(work)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`在 Bing 搜索作品：${work}（新窗口）`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-default-100 px-3 py-2 text-xs font-medium text-foreground outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Bing 搜索 <ExternalLink className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-divider px-6 py-12 text-center">
          <ScanFace
            className="mb-4 size-9 text-default-400"
            strokeWidth={1.5}
          />
          <p className="font-medium">未识别到角色</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-default-500">
            换一张角色更清晰的截图，或先裁掉界面和字幕。
          </p>
        </div>
      )}

      {result.traceId ? (
        <button
          type="button"
          className="inline-flex max-w-full items-center gap-1.5 text-left text-xs text-default-400 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={copied ? '已复制反馈编号' : '复制反馈编号'}
          onClick={copyTrace}
        >
          <span className="break-all">
            {copied ? '已复制反馈编号' : `反馈编号 ${result.traceId}`}
          </span>
          {copied ? (
            <Check className="size-3.5 shrink-0" />
          ) : (
            <Copy className="size-3.5 shrink-0" />
          )}
        </button>
      ) : null}
    </section>
  )
}
