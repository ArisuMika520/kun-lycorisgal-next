import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '~/prisma/index'
import { uploadPatchBanner } from './_upload'
import { patchCreateSchema } from '~/validations/edit'
import { handleBatchPatchTags } from './batchTag'
import { handleBatchPatchCompanies } from './batchCompany'
import { kunMoyuMoe } from '~/config/moyu-moe'
import { postToIndexNow } from './_postToIndexNow'

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

    console.log('游戏信息:', { name, vndbId, introduction, released, contentLimit })
    const bannerArrayBuffer = banner as ArrayBuffer
    console.log('Banner大小:', bannerArrayBuffer.byteLength)
    const galgameUniqueId = crypto.randomBytes(4).toString('hex')
    console.log('生成的游戏ID:', galgameUniqueId)

    const res = await prisma.$transaction(
      async (prisma) => {
        console.log('开始数据库事务')
        const patch = await prisma.patch.create({
          data: {
            name,
            unique_id: galgameUniqueId,
            vndb_id: vndbId ? vndbId : null,
            dlsite_id: input.dlsiteId ? input.dlsiteId : null,
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

        let finalIntro = introduction;
        let cgs: string[] = [];

        let developers: string[] = [];

        if (input.gameCGUrls) {
          try {
            const parsed = JSON.parse(input.gameCGUrls) as string[];
            if (Array.isArray(parsed)) {
              cgs = cgs.concat(parsed);
            }
          } catch (e) { console.error('Error parsing gameCGUrls', e) }
        }

        if (input.gameCGFiles) {
          const filesToUpload = Array.isArray(input.gameCGFiles)
            ? input.gameCGFiles
            : [input.gameCGFiles];

          if (filesToUpload.length > 0) {
            console.log('开始上传游戏CG, 数量:', filesToUpload.length);
            const { uploadPatchImages } = require('./_upload');
            const uploadedUrls = await uploadPatchImages(filesToUpload, newId);
            cgs = cgs.concat(uploadedUrls);
          }
        }

        if (cgs.length > 0) {
          const cgMd = cgs.map(url => `![](${url})`).join('\n\n');
          finalIntro += `\n\n## 游戏截图\n${cgMd}`;
        }

        if (input.gameLinks) {
          try {
            const links = JSON.parse(input.gameLinks) as { name: string, link: string }[];
            if (Array.isArray(links) && links.length > 0) {
              const linkMd = links.map(l => `::kun-link{text="${l.name || '链接'}" href="${l.link}"}`).join('\n\n');
              finalIntro += `\n\n## 相关链接\n\n${linkMd}`;
            }
          } catch (e) { console.error('Error parsing gameLinks', e) }
        }

        if (input.developers) {
          try {
            const devs = JSON.parse(input.developers) as string[];
            if (Array.isArray(devs) && devs.length > 0) {
              developers = devs;
            }
          } catch (e) { console.error('Error parsing developers', e) }
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

    return { uniqueId: galgameUniqueId }
  } catch (error) {
    console.error('创建游戏时发生错误:', error)
    console.error('错误堆栈:', error instanceof Error ? error.stack : 'Unknown error')
    return `创建游戏失败: ${error instanceof Error ? error.message : '未知错误'}`
  }
}
