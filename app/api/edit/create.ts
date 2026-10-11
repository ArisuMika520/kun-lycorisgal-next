import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { uploadPatchBanner, uploadPatchImages } from './_upload'
import { rehostPatchImages } from './_rehostImages'
import { patchCreateSchema } from '~/validations/edit'
import { handleBatchPatchTags } from './batchTag'
import { handleBatchPatchCompanies } from './batchCompany'
import { kunMoyuMoe } from '~/config/moyu-moe'
import { postToIndexNow } from './_postToIndexNow'
import {
  getPatchUniqueConstraintErrorMessage,
  normalizePatchExternalId
} from './_externalIds'
import { parseVndbWorkId } from '~/utils/vndbId'

interface CreateGalgameSuccess {
  uniqueId: string
}

export const createGalgame = async (
  input: Omit<z.infer<typeof patchCreateSchema>, 'alias' | 'tag'> & {
    alias: string[]
    tag: string[]
    gameCGFiles?: ArrayBuffer[]
    gameCGUrls?: string
    gameLinks?: string
    developers?: string
  },
  uid: number
) => {
  try {
    console.log('开始创建游戏，用户ID:', uid)
    const {
      name,
      vndbId,
      dlsiteId,
      alias,
      banner,
      tag,
      introduction,
      released,
      contentLimit
    } = input

    const parsedVndbId = parseVndbWorkId(vndbId)
    if (!parsedVndbId.ok) {
      return parsedVndbId.message
    }
    const normalizedVndbId = parsedVndbId.id
    const normalizedDlsiteId = normalizePatchExternalId(dlsiteId)

    const existingVndbPatch = await prisma.patch.findFirst({
      where: {
        vndb_id: { equals: normalizedVndbId, mode: 'insensitive' }
      },
      select: { name: true, unique_id: true }
    })
    if (existingVndbPatch) {
      return `VNDB ID 与游戏「${existingVndbPatch.name}」（/${existingVndbPatch.unique_id}）重复`
    }

    const galgameUniqueId = crypto.randomBytes(4).toString('hex')

    console.log('游戏信息:', {
      name,
      vndbId: normalizedVndbId,
      dlsiteId: normalizedDlsiteId,
      introduction,
      released,
      contentLimit
    })
    const bannerArrayBuffer = banner as ArrayBuffer
    console.log('Banner大小:', bannerArrayBuffer.byteLength)
    console.log('生成的游戏ID:', galgameUniqueId)

    const res = await prisma.$transaction(
      async (prisma) => {
        console.log('开始数据库事务')
        const patch = await prisma.patch.create({
          data: {
            name,
            unique_id: galgameUniqueId,
            vndb_id: normalizedVndbId,
            dlsite_id: normalizedDlsiteId,
            introduction,
            user_id: uid,
            banner: '',
            released,
            content_limit: contentLimit
          }
        })
        console.log('创建patch成功，ID:', patch.id)

        const newId = patch.id

        console.log('开始上传banner图片')
        const uploadResult = await uploadPatchBanner(bannerArrayBuffer, newId)
        if (typeof uploadResult === 'string') {
          console.error('图片上传失败:', uploadResult)
          throw new Error(uploadResult)
        }
        console.log('图片上传成功')
        const imageLink = `${process.env.KUN_VISUAL_NOVEL_IMAGE_BED_URL}/patch/${newId}/banner/banner.avif`

        let finalIntro = introduction
        let cgs: string[] = []

        let developers: string[] = []

        if (input.gameCGUrls) {
          let parsedCgUrls: string[] | null = null
          try {
            const parsed = JSON.parse(input.gameCGUrls) as string[]
            if (Array.isArray(parsed)) {
              parsedCgUrls = parsed.filter((url) => typeof url === 'string')
            }
          } catch (e) {
            console.error('Error parsing gameCGUrls', e)
          }
          if (parsedCgUrls) {
            const hosted = await rehostPatchImages(parsedCgUrls, newId)
            cgs = cgs.concat(hosted)
          }
        }

        if (input.gameCGFiles) {
          const filesToUpload = Array.isArray(input.gameCGFiles)
            ? input.gameCGFiles
            : [input.gameCGFiles]

          if (filesToUpload.length > 0) {
            console.log('开始上传游戏CG, 数量:', filesToUpload.length)
            const uploadedUrls = await uploadPatchImages(filesToUpload, newId)
            if (uploadedUrls.length === 0) {
              throw new Error('游戏截图上传失败')
            }
            cgs = cgs.concat(uploadedUrls)
          }
        }

        if (cgs.length > 0) {
          const cgMd = cgs.map((url) => `![](${url})`).join('\n\n')
          finalIntro += `\n\n## 游戏截图\n${cgMd}`
        }

        if (input.gameLinks) {
          try {
            const links = JSON.parse(input.gameLinks) as {
              name: string
              link: string
            }[]
            if (Array.isArray(links) && links.length > 0) {
              const linkMd = links
                .map(
                  (l) =>
                    `::kun-link{text="${l.name || '链接'}" href="${l.link}"}`
                )
                .join('\n\n')
              finalIntro += `\n\n## 相关链接\n\n${linkMd}`
            }
          } catch (e) {
            console.error('Error parsing gameLinks', e)
          }
        }

        if (input.developers) {
          try {
            const devs = JSON.parse(input.developers) as string[]
            if (Array.isArray(devs) && devs.length > 0) {
              developers = devs
            }
          } catch (e) {
            console.error('Error parsing developers', e)
          }
        }

        await prisma.patch.update({
          where: { id: newId },
          data: {
            banner: imageLink,
            introduction: finalIntro
          }
        })

        if (alias.length) {
          const aliasData = alias.map((name) => ({
            name,
            patch_id: newId
          }))
          await prisma.patch_alias.createMany({
            data: aliasData,
            skipDuplicates: true
          })
        }

        await prisma.user.update({
          where: { id: uid },
          data: {
            daily_image_count: { increment: 1 },
            moemoepoint: { increment: 3 }
          }
        })

        return { patchId: newId, developers }
      },
      { timeout: 60000 }
    )

    if (typeof res === 'string') {
      return res
    }

    if (tag.length > 0) {
      await handleBatchPatchTags(res.patchId, tag, uid)
    }

    if (res.developers && res.developers.length > 0) {
      await handleBatchPatchCompanies(res.patchId, res.developers, uid)
    }

    if (contentLimit === 'sfw') {
      const newPatchUrl = `${kunMoyuMoe.domain.main}/${galgameUniqueId}`
      await postToIndexNow(newPatchUrl)
    }

    return { uniqueId: galgameUniqueId } satisfies CreateGalgameSuccess
  } catch (error) {
    const duplicateMessage = getPatchUniqueConstraintErrorMessage(error)
    if (duplicateMessage) {
      return duplicateMessage
    }

    console.error('创建游戏时发生错误:', error)
    console.error(
      '错误堆栈:',
      error instanceof Error ? error.stack : 'Unknown error'
    )
    return `创建游戏失败: ${error instanceof Error ? error.message : '未知错误'}`
  }
}
