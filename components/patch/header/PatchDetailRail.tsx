'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from '@bprogress/next'
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure
} from '@heroui/react'
import { Download, ExternalLink, Pencil, Share2, Trash2 } from 'lucide-react'
import dayjs from 'dayjs'
import { FeedbackButton } from '~/components/patch/header/button/FeedbackButton'
import { FavoriteButton } from '~/components/patch/header/button/favorite/FavoriteButton'
import { KunExternalLink } from '~/components/kun/external-link/ExternalLink'
import { GALGAME_AGE_LIMIT_MAP } from '~/constants/galgame'
import {
  SUPPORTED_LANGUAGE_MAP,
  SUPPORTED_TYPE_MAP
} from '~/constants/resource'
import { kunMoyuMoe } from '~/config/moyu-moe'
import { useUserStore } from '~/store/userStore'
import { getImageProxySrc } from '~/utils/imageProxy'
import { kunCopy } from '~/utils/kunCopy'
import { kunFetchDelete } from '~/utils/kunFetch'
import toast from 'react-hot-toast'
import { PATCH_DETAIL_TAB_CHANGE_EVENT } from './events'
import type { PatchDetailData } from './types'
import styles from './patch-detail.module.css'

interface Props {
  data: PatchDetailData
}

const formatReleasedDate = (value?: string | null) => {
  const trimmed = value?.trim() ?? ''
  if (!trimmed || trimmed === 'unknown' || trimmed === 'future') {
    return '未知'
  }

  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) {
    return trimmed
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return trimmed
  }

  return `${year}年${month}月${day}日`
}

const formatPublishedDate = (value?: string | null) => {
  if (!value) {
    return '未知'
  }

  const parsed = dayjs(value)
  if (!parsed.isValid()) {
    return value
  }

  return parsed.format('YYYY年M月D日')
}

const OFFICIAL_LABELS = new Set([
  '官网',
  '官方网站',
  '官方站点',
  'official website',
  'official site'
])

const isOfficialLabel = (label: string) =>
  OFFICIAL_LABELS.has(label.split(',')[0].trim().toLowerCase())

const isHttpHref = (href: string) => {
  try {
    const url = new URL(href.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const parseKunLinkAttrs = (blob: string) => {
  const source = blob.trim()
  if (!source) {
    return null
  }

  const pattern = /\s*([A-Za-z_][\w:.-]*)="([^"]*)"/y
  const attrs: Record<string, string> = {}

  while (pattern.lastIndex < source.length) {
    const attr = pattern.exec(source)
    if (!attr) {
      return null
    }

    attrs[attr[1]] = attr[2]
  }

  return attrs
}

const resolveOfficialHref = (data: PatchDetailData) => {
  const related = data.relatedLinks.find(
    (item) => isOfficialLabel(item.label) && isHttpHref(item.href)
  )
  if (related) {
    return related.href
  }

  const markdown = data.patch.introduction || ''
  const kunLinkPattern = /::kun-link\{([^}]+)\}/g
  let match: RegExpExecArray | null = kunLinkPattern.exec(markdown)
  while (match) {
    const attrs = parseKunLinkAttrs(match[1])
    if (attrs) {
      const text = attrs.text ?? ''
      const href = attrs.href ?? ''
      if (isOfficialLabel(text) && isHttpHref(href)) {
        return href
      }
    }
    match = kunLinkPattern.exec(markdown)
  }

  const markdownLinkPattern = /(?<!!)\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
  match = markdownLinkPattern.exec(markdown)
  while (match) {
    if (isOfficialLabel(match[1]) && isHttpHref(match[2])) {
      return match[2]
    }
    match = markdownLinkPattern.exec(markdown)
  }

  return null
}

const toOfficialHref = (href: string) =>
  `/redirect?url=${encodeURIComponent(href)}`

const DetailRow = ({
  label,
  children
}: {
  label: string
  children: ReactNode
}) => (
  <div className={styles.detailRow}>
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
)

export const PatchDetailRail = ({ data }: Props) => {
  const router = useRouter()
  const { user } = useUserStore((state) => state)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [deleting, setDeleting] = useState(false)
  const { patch, intro } = data
  const company = patch.companies[0]
  const coverSrc = getImageProxySrc(patch.banner)
  const officialHref = resolveOfficialHref(data)
  const officialUrl = officialHref ? toOfficialHref(officialHref) : null
  const ageLabel =
    GALGAME_AGE_LIMIT_MAP[patch.contentLimit] || patch.contentLimit
  const languages = patch.language.filter((item) => item && item !== 'all')
  const types = patch.type.filter((item) => item && item !== 'all')
  const canManage = user.role > 2

  const openResources = () => {
    window.dispatchEvent(
      new CustomEvent(PATCH_DETAIL_TAB_CHANGE_EVENT, {
        detail: { tab: 'resources' }
      })
    )
  }

  const handleShare = () => {
    kunCopy(`${patch.name} - ${kunMoyuMoe.domain.main}/${patch.uniqueId}`)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await kunFetchDelete<KunResponse<{}>>('/api/patch', {
      patchId: patch.id
    })

    if (typeof res === 'string') {
      toast.error(res)
    } else {
      toast.success('删除 Galgame 成功')
      router.push('/')
    }

    onClose()
    setDeleting(false)
  }

  const handlePressDelete = () => {
    if (user.uid !== patch.user.id && user.role < 4) {
      toast.error('仅游戏发布者或超级管理员可删除该游戏')
      return
    }

    onOpen()
  }

  return (
    <aside className={styles.rail}>
      <section className={styles.railSection}>
        <div className={styles.headerStack}>
          <div className={styles.titleBlock}>
            {company ? (
              <Link href={`/company/${company.id}`} className={styles.seller}>
                <span className={styles.sellerAvatar}>
                  {company.name.slice(0, 1)}
                </span>
                <span className={styles.sellerName}>{company.name}</span>
              </Link>
            ) : (
              <Link
                href={`/user/${patch.user.id}/resource`}
                className={styles.seller}
              >
                <span className={styles.sellerAvatar}>
                  {patch.user.avatar ? (
                    <img src={patch.user.avatar} alt="" />
                  ) : (
                    patch.user.name.slice(0, 1)
                  )}
                </span>
                <span className={styles.sellerName}>{patch.user.name}</span>
              </Link>
            )}
            <h1 className={styles.displayLg}>{patch.name}</h1>
          </div>
          {coverSrc ? (
            <div className={styles.cover}>
              <img src={coverSrc} alt={`${patch.name} 封面`} />
            </div>
          ) : (
            <div className={`${styles.cover} ${styles.coverEmpty}`}>
              暂无封面
            </div>
          )}
          <div className={styles.ctaStack}>
            {officialUrl ? (
              <Link className={styles.primaryButton} href={officialUrl}>
                <ExternalLink className="size-4" aria-hidden="true" />
                支持正版
              </Link>
            ) : (
              <button
                type="button"
                className={styles.primaryButton}
                disabled
                title="暂无官网链接"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                支持正版
              </button>
            )}
            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={openResources}
              >
                <Download className="size-4" aria-hidden="true" />
                下载
              </button>
              <FavoriteButton
                patchId={patch.id}
                isFavorite={patch.isFavorite}
                variant="rail"
                className={styles.iconButton}
              />
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleShare}
                aria-label="复制分享链接"
                title="复制分享链接"
              >
                <Share2 className="size-4" />
              </button>
            </div>
            <div className={styles.toolRow}>
              {canManage && (
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => router.push('/edit/rewrite')}
                  aria-label="编辑游戏信息"
                  title="编辑游戏信息"
                >
                  <Pencil className="size-4" />
                </button>
              )}
              {canManage && (
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={handlePressDelete}
                  aria-label="删除游戏"
                  title="删除游戏"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
              <FeedbackButton
                patch={patch}
                className={styles.iconButton}
                appearance="plain"
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.railSection}>
        <div className={styles.sectionStack}>
          <h2 className={styles.displaySm}>详情</h2>
          <dl className={styles.details}>
            <DetailRow label="已发布">{formatPublishedDate(patch.created)}</DetailRow>
            <DetailRow label="发售时间">
              {formatReleasedDate(intro.released)}
            </DetailRow>
            <DetailRow label="年龄分级">{ageLabel}</DetailRow>
            <DetailRow label="发布者">
              <Link
                href={`/user/${patch.user.id}/resource`}
                className={styles.detailLink}
              >
                {patch.user.name}
              </Link>
            </DetailRow>
            {patch.companies.length > 0 && (
              <DetailRow label="制作会社">
                <span className={styles.detailLinks}>
                  {patch.companies.map((item) => (
                    <Link
                      key={item.id}
                      href={`/company/${item.id}`}
                      className={styles.detailLink}
                    >
                      {item.name}
                    </Link>
                  ))}
                </span>
              </DetailRow>
            )}
            {languages.length > 0 && (
              <DetailRow label="语言">
                {languages
                  .map((item) => SUPPORTED_LANGUAGE_MAP[item] || item)
                  .join(' / ')}
              </DetailRow>
            )}
            {types.length > 0 && (
              <DetailRow label="类型">
                {types
                  .map((item) => SUPPORTED_TYPE_MAP[item] || item)
                  .join(' / ')}
              </DetailRow>
            )}
            {patch.vndbId && (
              <DetailRow label="VNDB">
                <KunExternalLink
                  link={`https://vndb.org/${patch.vndbId}`}
                  showAnchorIcon={false}
                  className={styles.detailLink}
                >
                  {patch.vndbId}
                </KunExternalLink>
              </DetailRow>
            )}
            {data.dlsiteId && (
              <DetailRow label="DLsite">
                <KunExternalLink
                  link={`https://www.dlsite.com/home/work/=/product_id/${data.dlsiteId}.html`}
                  showAnchorIcon={false}
                  className={styles.detailLink}
                >
                  {data.dlsiteId}
                </KunExternalLink>
              </DetailRow>
            )}
            <DetailRow label="唯一 ID">{patch.uniqueId}</DetailRow>
          </dl>
        </div>
      </section>

      <Modal isOpen={isOpen} onClose={onClose} placement="center">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            永久删除 Galgame
          </ModalHeader>
          <ModalBody>
            严重警告, 删除 Galgame 将会删除这个 Galgame 下面所有的评论,
            所有的资源链接, 所有的贡献历史记录, 您确定要删除吗
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              取消
            </Button>
            <Button
              color="danger"
              onPress={handleDelete}
              isDisabled={deleting}
              isLoading={deleting}
            >
              删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </aside>
  )
}
