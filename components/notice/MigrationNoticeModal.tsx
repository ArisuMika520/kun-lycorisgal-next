'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from '@heroui/react'
import { kunFetchGet } from '~/utils/kunFetch'
import type { MigrationNoticeConfig } from '~/types/api/admin'

// localStorage / sessionStorage 共用同一个 key, 值为 { v: 版本号 }
const DISMISS_KEY = 'kun-migration-notice-dismiss'

// 装饰贴纸 (public/ 下的本地素材)
const STICKER_PRIMARY = '/lycorisgal.png'
const STICKER_SECONDARY = '/sticker.webp'

const readDismissedVersion = (storage: Storage): number | null => {
  try {
    const raw = storage.getItem(DISMISS_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as { v?: unknown }
    return typeof parsed?.v === 'number' ? parsed.v : null
  } catch {
    return null
  }
}

const writeDismissedVersion = (storage: Storage, version: number) => {
  try {
    storage.setItem(DISMISS_KEY, JSON.stringify({ v: version }))
  } catch {
    // 隐私模式 / 存储被禁用时静默失败, 不影响关闭
  }
}

/**
 * 是否应展示公告:
 *  - 未启用 / 无有效版本 → 不展示
 *  - 本版本已"不再通知"(localStorage 永久) → 不展示
 *  - 本版本已"确定"(sessionStorage 当前会话) → 不展示
 *  管理员修改内容会自增版本号, 旧的关闭记录因版本不匹配而失效 → 重新展示。
 */
const shouldShowNotice = (config: MigrationNoticeConfig): boolean => {
  if (!config.enabled || !config.version || config.version < 1) {
    return false
  }
  if (typeof window === 'undefined') {
    return false
  }
  if (readDismissedVersion(window.localStorage) === config.version) {
    return false
  }
  if (readDismissedVersion(window.sessionStorage) === config.version) {
    return false
  }
  return true
}

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  content: string
  onConfirm: () => void
  onNeverNotify: () => void
}

/**
 * 纯展示弹窗: 站点统一 HeroUI 风格 + 樱粉主题点缀 + 双贴纸装饰。
 * 同时被线上全局弹窗与管理员预览复用。
 */
export const MigrationNoticeDialog = ({
  isOpen,
  onClose,
  title,
  content,
  onConfirm,
  onNeverNotify
}: DialogProps) => {
  const paragraphs = content.split('\n').map((line) => line.trimEnd())

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      backdrop="blur"
      size="2xl"
      scrollBehavior="inside"
      hideCloseButton
      classNames={{
        base: 'overflow-visible border border-primary-100 dark:border-default-100',
        wrapper: 'overflow-visible'
      }}
    >
      <ModalContent className="overflow-visible">
        {/* 顶部樱粉渐变细条 */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-20 h-1 rounded-t-large bg-gradient-to-r from-primary-300 via-primary-400 to-secondary-300"
        />

        {/* 右上角探出的小贴纸 (z-30, 盖在顶部彩条之上) */}
        <img
          src={STICKER_SECONDARY}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute -right-4 -top-9 z-30 size-24 rotate-12 select-none drop-shadow-md [animation:kun-mn-float_7s_ease-in-out_infinite] motion-reduce:animate-none sm:-right-7 sm:-top-11 sm:size-28"
        />

        {/* 主体: 左侧大图(窗口主体的一部分) + 右侧内容 */}
        <div className="flex items-stretch">
          {/* 左侧边图: 占据近半窗口, 尽量完整呈现, 右缘融入内容区 */}
          <div className="relative w-2/5 shrink-0 overflow-hidden rounded-l-large bg-primary-50/70 dark:bg-default-100 sm:w-1/2">
            <img
              src={STICKER_PRIMARY}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="size-full select-none object-cover object-center"
            />
            {/* 右缘柔化, 让图片右侧自然融入右侧内容窗口 */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-content1"
            />
          </div>

          {/* 右侧内容列 */}
          <div className="flex min-w-0 flex-1 flex-col">
            <ModalHeader className="flex flex-col gap-1 pr-12">
              <span className="text-xs font-medium uppercase tracking-widest text-primary-500">
                LyCorisGal · 公告
              </span>
              <h2 className="text-xl font-bold leading-snug text-foreground sm:text-2xl">
                {title}
              </h2>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-2 text-sm leading-relaxed text-default-700 sm:text-base">
                {paragraphs.map((line, index) =>
                  line ? (
                    <p key={index}>{line}</p>
                  ) : (
                    <span
                      key={index}
                      className="block h-2"
                      aria-hidden="true"
                    />
                  )
                )}
              </div>
            </ModalBody>

            <ModalFooter className="justify-between gap-2">
              <Button
                variant="light"
                className="text-default-500"
                onPress={onNeverNotify}
              >
                不再通知
              </Button>
              <Button color="primary" variant="shadow" onPress={onConfirm}>
                确定
              </Button>
            </ModalFooter>
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}

/**
 * 全局自驱动弹窗: 在根布局挂载一次, 拉取公开公告配置并按 shouldShowNotice 决定是否展示。
 * 对所有访客(含未登录)生效。
 */
export const MigrationNoticeModal = () => {
  const pathname = usePathname()
  const [config, setConfig] = useState<MigrationNoticeConfig | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        const res = await kunFetchGet<MigrationNoticeConfig>(
          '/api/setting/migration-notice'
        )
        // 接口正常时返回配置对象; 非对象(异常/错误串)直接忽略
        if (!active || !res || typeof res !== 'object') {
          return
        }
        if (shouldShowNotice(res)) {
          setConfig(res)
          setIsOpen(true)
        }
      } catch {
        // 配置接口异常时不打扰用户
      }
    }

    run()
    return () => {
      active = false
    }
  }, [])

  // 后台管理页(管理员正在编辑公告)不弹出公告, 避免遮挡表单与重复打扰
  if (!config || pathname?.startsWith('/admin')) {
    return null
  }

  // "确定" 与 关闭(背景/ESC): 当前会话内不再弹出, 换会话或新版本会再次出现
  const dismissForSession = () => {
    writeDismissedVersion(window.sessionStorage, config.version)
    setIsOpen(false)
  }

  // "不再通知": 永久记住该版本, 不再弹出 (内容更新后版本变化会重新提示)
  const dismissPermanently = () => {
    writeDismissedVersion(window.localStorage, config.version)
    setIsOpen(false)
  }

  return (
    <MigrationNoticeDialog
      isOpen={isOpen}
      onClose={dismissForSession}
      title={config.title}
      content={config.content}
      onConfirm={dismissForSession}
      onNeverNotify={dismissPermanently}
    />
  )
}
