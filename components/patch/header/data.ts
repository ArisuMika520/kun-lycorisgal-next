import { cache } from 'react'
import { prisma } from '~/prisma/index'
import { getPatchById } from '~/app/api/patch/get'
import { getPatchIntroduction } from '~/app/api/patch/introduction/route'
import { markdownToHtmlExtend } from '~/app/api/utils/render/markdownToHtmlExtend'
import { verifyHeaderCookie } from '~/utils/actions/verifyHeaderCookie'
import {
  collectOfficialHrefs,
  rewriteOfficialHrefs
} from '~/lib/nextmoe/affiliateUrl'
import { resolveOfficialPurchase } from '~/lib/nextmoe/purchaseLink'
import type {
  PatchDetailData,
  PatchDetailLink,
  PatchDetailScreenshot
} from './types'

const normalizeMarkdown = (markdown: string) => markdown.replace(/\r\n/g, '\n')

const escapeForRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractSectionBlock = (markdown: string, heading: string) => {
  const pattern = new RegExp(
    `(^|\\n)##\\s*${escapeForRegex(heading)}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    'm'
  )

  const match = markdown.match(pattern)
  if (!match) {
    return null
  }

  return {
    block: match[0],
    content: match[2].trim()
  }
}

const parseMarkdownImages = (section: string): PatchDetailScreenshot[] => {
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (!line.startsWith('![')) {
        return null
      }

      const altEndIndex = line.indexOf('](')
      const urlEndIndex = line.lastIndexOf(')')
      if (altEndIndex < 0 || urlEndIndex < 0) {
        return null
      }

      const alt = line.slice(2, altEndIndex).trim() || '游戏截图'
      const rawUrl = line.slice(altEndIndex + 2, urlEndIndex).trim()
      if (!rawUrl) {
        return null
      }

      const url = rawUrl.split(/\s+"/)[0].trim()
      if (!url) {
        return null
      }

      return {
        src: url,
        alt
      }
    })
    .filter((item): item is PatchDetailScreenshot => Boolean(item))
}

const isSafeHref = (href: string): boolean => {
  const value = href.trim()

  // Allow same-origin relative paths and in-page anchors.
  if (value.startsWith('/') || value.startsWith('#')) {
    return true
  }

  try {
    // Use a dummy base to support relative URLs in a safe way.
    const url = new URL(value, 'https://example.com')
    const protocol = url.protocol.toLowerCase()
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    // Malformed URLs are treated as unsafe.
    return false
  }
}

const parseKunLinks = (section: string): PatchDetailLink[] => {
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/::kun-link\{text="([^"]+)" href="([^"]+)"\}/)
      if (!match) {
        return null
      }

      const label = match[1].trim()
      const href = match[2].trim()

      if (!isSafeHref(href)) {
        return null
      }

      return {
        label,
        href
      }
    })
    .filter((item): item is PatchDetailLink => Boolean(item))
}

const cleanupBodyMarkdown = (markdown: string) =>
  markdown.replace(/\n{3,}/g, '\n\n').trim()

const parseStructuredContent = (markdown: string) => {
  let nextBody = normalizeMarkdown(markdown)

  const screenshotSection = extractSectionBlock(nextBody, '游戏截图')
  const screenshots = screenshotSection
    ? parseMarkdownImages(screenshotSection.content)
    : []
  if (screenshotSection && screenshots.length > 0) {
    nextBody = nextBody.replace(screenshotSection.block, '\n')
  }

  const linkSection = extractSectionBlock(nextBody, '相关链接')
  const relatedLinks = linkSection ? parseKunLinks(linkSection.content) : []
  if (linkSection && relatedLinks.length > 0) {
    nextBody = nextBody.replace(linkSection.block, '\n')
  }

  return {
    screenshots,
    relatedLinks,
    bodyMarkdown: cleanupBodyMarkdown(nextBody)
  }
}

const getPatchDetailExtra = cache(async (uniqueId: string) => {
  return prisma.patch.findUnique({
    where: { unique_id: uniqueId },
    select: {
      dlsite_id: true
    }
  })
})

export const getPatchDetailData = cache(async (uniqueId: string) => {
  const payload = await verifyHeaderCookie()

  const [patch, intro, extra] = await Promise.all([
    getPatchById({ uniqueId }, payload?.uid ?? 0),
    getPatchIntroduction({ uniqueId }),
    getPatchDetailExtra(uniqueId)
  ])

  if (typeof patch === 'string') {
    return patch
  }

  if (typeof intro === 'string') {
    return intro
  }

  if (!extra) {
    return '未找到对应 Galgame'
  }

  const structured = parseStructuredContent(patch.introduction)
  const shouldUseStructuredBody =
    structured.screenshots.length > 0 || structured.relatedLinks.length > 0
  const officialHrefs = collectOfficialHrefs({
    markdown: patch.introduction,
    links: structured.relatedLinks
  })
  const officialPurchasePromise = resolveOfficialPurchase({
    dlsiteId: extra.dlsite_id,
    vndbId: patch.vndbId,
    officialHrefs
  }).catch(() => null)

  const [renderedBody, officialPurchase] = await Promise.all([
    shouldUseStructuredBody
      ? structured.bodyMarkdown
        ? markdownToHtmlExtend(structured.bodyMarkdown)
        : ''
      : intro.introduction,
    officialPurchasePromise
  ])
  const purchaseUrl = officialPurchase?.purchaseUrl
  const relatedLinks = purchaseUrl
    ? structured.relatedLinks.map((item) =>
        officialHrefs.includes(item.href)
          ? { ...item, href: purchaseUrl }
          : item
      )
    : structured.relatedLinks
  const response: PatchDetailData = {
    patch,
    intro,
    dlsiteId: extra.dlsite_id,
    officialPurchase,
    bodyHtml: purchaseUrl
      ? rewriteOfficialHrefs(renderedBody, officialHrefs, purchaseUrl)
      : renderedBody,
    fullHtml: purchaseUrl
      ? rewriteOfficialHrefs(intro.introduction, officialHrefs, purchaseUrl)
      : intro.introduction,
    screenshots: structured.screenshots,
    relatedLinks,
    uid: payload?.uid
  }

  return response
})
