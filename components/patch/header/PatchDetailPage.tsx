import Link from 'next/link'
import { Chip } from '@heroui/chip'
import { Inter, Inter_Tight } from 'next/font/google'
import { KunNull } from '~/components/kun/Null'
import { EditBanner } from '~/components/patch/header/EditBanner'
import { cn } from '~/utils/cn'
import { getImageProxySrc } from '~/utils/imageProxy'
import { PatchDetailClientEffects } from './PatchDetailClientEffects'
import { PatchDetailHtml } from './PatchDetailHtml'
import { PatchDetailMediaCarousel } from './PatchDetailMediaCarousel'
import { PatchDetailRail } from './PatchDetailRail'
import { PatchDetailTabs } from './PatchDetailTabs'
import type { PatchDetailData, PatchDetailPreviewImage } from './types'
import styles from './patch-detail.module.css'

const fabSans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--fab-sans'
})

const fabDisplay = Inter_Tight({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
  variable: '--fab-display'
})

interface Props {
  data: PatchDetailData
}

const parseImagesFromHtml = (html: string): PatchDetailPreviewImage[] => {
  if (!html) {
    return []
  }

  const images: PatchDetailPreviewImage[] = []
  const imageRegex =
    /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>|<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*>|<img[^>]*src=["']([^"']+)["'][^>]*>/gi

  let match: RegExpExecArray | null = imageRegex.exec(html)
  while (match) {
    const src = (match[1] || match[4] || match[5] || '').trim()
    const alt = (match[2] || match[3] || '').trim()

    if (src) {
      images.push({ src, alt })
    }

    match = imageRegex.exec(html)
  }

  return images
}

const getOverviewPreviewImages = (
  data: PatchDetailData
): PatchDetailPreviewImage[] => {
  const map = new Map<string, PatchDetailPreviewImage>()

  const push = (image: PatchDetailPreviewImage) => {
    const src = getImageProxySrc(image.src) || image.src
    if (!src || map.has(src)) {
      return
    }

    map.set(src, { ...image, src })
  }

  if (data.patch.banner?.trim()) {
    push({ src: data.patch.banner.trim(), alt: `${data.patch.name} 封面` })
  }

  parseImagesFromHtml(data.bodyHtml).forEach(push)
  parseImagesFromHtml(data.fullHtml).forEach(push)
  data.screenshots.forEach((item) => push({ src: item.src, alt: item.alt }))

  return Array.from(map.values())
}

const stripImagesFromOverviewHtml = (html: string) => {
  if (!html) {
    return ''
  }

  return html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<figure[^>]*>\s*<\/figure>/gi, '')
    .replace(/<p>\s*(?:<a[^>]*>\s*<\/a>)?\s*<\/p>/gi, '')
    .replace(/<div>\s*<\/div>/gi, '')
}

const OverviewBlock = ({ data }: { data: PatchDetailData }) => {
  const bodyWithoutImages = stripImagesFromOverviewHtml(data.bodyHtml).trim()
  const fullWithoutImages = stripImagesFromOverviewHtml(data.fullHtml).trim()
  const shouldShowBody = Boolean(bodyWithoutImages)

  if (shouldShowBody) {
    return <PatchDetailHtml html={bodyWithoutImages} className={styles.copy} />
  }

  if (data.screenshots.length > 0) {
    return (
      <p className={styles.emptyCopy}>
        这条目当前的正文主体已经被拆分到媒体区块中了。
      </p>
    )
  }

  if (!fullWithoutImages || data.relatedLinks.length > 0) {
    return (
      <p className={styles.emptyCopy}>
        当前条目暂无正文简介，已保留完整资料信息和资源评论分区。
      </p>
    )
  }

  return <PatchDetailHtml html={fullWithoutImages} className={styles.copy} />
}

const InfoTabContent = ({ data }: { data: PatchDetailData }) => {
  return (
    <div className={styles.infoStack}>
      <section className={styles.infoSection}>
        <h2 className={styles.displayMd}>描述</h2>
        <OverviewBlock data={data} />
      </section>

      {data.intro.tag.length > 0 && (
        <section className={styles.infoSection}>
          <h2 className={styles.displayMd}>标签</h2>
          <div className={styles.linkCloud}>
            {data.intro.tag.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.id}`}
                className="inline-flex max-w-full transition-opacity hover:opacity-80"
              >
                <Chip color="secondary" variant="flat" className="max-w-full">
                  {tag.name}
                  <span className="ml-1 opacity-80">+{tag.count}</span>
                </Chip>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.patch.companies.length > 0 && (
        <section className={styles.infoSection}>
          <h2 className={styles.displayMd}>制作会社</h2>
          <div className={styles.linkCloud}>
            {data.patch.companies.map((company) => (
              <Link
                key={company.id}
                href={`/company/${company.id}`}
                className="inline-flex max-w-full transition-opacity hover:opacity-80"
              >
                <Chip
                  color="warning"
                  variant="flat"
                  size="lg"
                  className="max-w-full"
                >
                  {company.name}
                </Chip>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data.intro.alias.length > 0 && (
        <section className={styles.infoSection}>
          <h2 className={styles.displayMd}>别名</h2>
          <p className={styles.aliasLine}>{data.intro.alias.join(' / ')}</p>
        </section>
      )}

    </div>
  )
}

export const PatchDetailPage = ({ data }: Props) => {
  const isBlockedByNsfw = data.patch.contentLimit === 'nsfw' && !data.uid

  if (isBlockedByNsfw) {
    return (
      <div
        className={cn(fabSans.variable, fabDisplay.variable, styles.page)}
      >
        <KunNull message="请登录后查看 NSFW 游戏" />
      </div>
    )
  }

  const overviewImages = getOverviewPreviewImages(data)

  return (
    <>
      <PatchDetailClientEffects data={data} />
      <div
        className={cn(fabSans.variable, fabDisplay.variable, styles.page)}
      >
        <div className={styles.layout}>
          <div className={styles.medias}>
            <PatchDetailMediaCarousel
              images={overviewImages}
              name={data.patch.name}
              editor={
                <EditBanner patch={data.patch} className={styles.editBanner} />
              }
            />
          </div>
          <div className={styles.aside}>
            <PatchDetailRail data={data} />
          </div>
          <div className={styles.infos}>
            <PatchDetailTabs data={data}>
              <InfoTabContent data={data} />
            </PatchDetailTabs>
          </div>
        </div>
      </div>
    </>
  )
}
