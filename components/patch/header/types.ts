import type { OfficialPurchase } from '~/lib/nextmoe/affiliateUrl'
import type { Patch, PatchIntroduction } from '~/types/api/patch'

export type PatchDetailTabKey = 'info' | 'resources' | 'comments'

export interface PatchDetailScreenshot {
  src: string
  alt: string
}

export interface PatchDetailPreviewImage {
  src: string
  alt: string
}

export interface PatchDetailLink {
  label: string
  href: string
}

export interface PatchDetailData {
  patch: Patch
  intro: PatchIntroduction
  dlsiteId: string | null
  officialPurchase: OfficialPurchase | null
  bodyHtml: string
  fullHtml: string
  screenshots: PatchDetailScreenshot[]
  relatedLinks: PatchDetailLink[]
  uid?: number
}
