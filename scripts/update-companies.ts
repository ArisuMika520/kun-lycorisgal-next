import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

interface UpdateStats {
    total: number
    success: number
    failed: number
    skipped: number
    failedIds: { patchId: number; vndbId: string; error: string }[]
}

// 延迟函数（避免 API 限流）
const delay = (ms: number) => {
    const { promise, resolve } = Promise.withResolvers<void>()
    setTimeout(resolve, ms)
    return promise
}

// 同一补丁遇 429 最多重试 3 次；仍限流则记失败并停止后续请求
const RATE_LIMIT_RETRIES = 3

async function updateGameCompanies(limit?: number, dryRun = false) {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const projectRoot = path.resolve(__dirname, '..')
    // PrismaClient reads KUN_DATABASE_URL at module eval. ESM evaluates static
    // imports before this body, so .env must load before these dynamic imports.
    dotenv.config({ path: path.join(projectRoot, '.env') })

    const { prisma } = await import('../prisma/index')
    const { fetchNextMoeMetadata, NextMoeError } = await import('../app/api/spider/lib/api/nextmoe')
    const { handleBatchPatchCompanies } = await import('../app/api/edit/batchCompany')

    console.log('='.repeat(60))
    console.log('🚀 开始批量更新游戏公司信息')
    console.log('='.repeat(60))

    const stats: UpdateStats = {
        total: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        failedIds: []
    }

    const fetchMetadata = async (vndbId: string) => {
        for (let attempt = 0; ; attempt++) {
            try {
                return await fetchNextMoeMetadata(vndbId)
            } catch (error: unknown) {
                if (!(error instanceof NextMoeError) || error.status !== 429) {
                    throw error
                }
                if (attempt >= RATE_LIMIT_RETRIES) {
                    throw error
                }
                const waitSec = Math.max(2, error.retryAfterSec ?? 60)
                console.error(`  ⏳ NextMoe 限流，等待 ${waitSec} 秒后重试同一游戏 (${attempt + 1}/${RATE_LIMIT_RETRIES})`)
                await delay(waitSec * 1000)
            }
        }
    }

    try {
        console.log('\n📊 查询需要更新的游戏...')
        const patches = await prisma.patch.findMany({
            where: {
                AND: [
                    { vndb_id: { not: null } },
                    { vndb_id: { not: '' } }
                ]
            },
            select: {
                id: true,
                vndb_id: true,
                name: true,
                user_id: true
            },
            ...(limit && { take: limit })
        })

        stats.total = patches.length
        console.log(`✅ 找到 ${stats.total} 个游戏需要更新`)

        if (dryRun) {
            console.log('\n⚠️  DRY RUN 模式：不会实际更新数据库')
        }

        for (let i = 0; i < patches.length; i++) {
            const patch = patches[i]
            const progress = `[${i + 1}/${stats.total}]`

            console.log(`\n${progress} 处理游戏: ${patch.name} (ID: ${patch.id}, VNDB: ${patch.vndb_id})`)

            try {
                console.log(`  ⏳ 正在从 NextMoe 获取数据...`)
                const metadata = await fetchMetadata(patch.vndb_id!)
                const companyNames = [...new Set(
                    metadata.companies.map((company) => company.name.trim()).filter(Boolean)
                )]

                if (companyNames.length === 0) {
                    console.log(`  ℹ️  该游戏没有公司信息，跳过`)
                    stats.skipped++
                } else {
                    console.log(`  📦 找到 ${companyNames.length} 个公司: ${companyNames.join(', ')}`)

                    if (!dryRun) {
                        console.log(`  💾 正在更新数据库...`)
                        await handleBatchPatchCompanies(
                            patch.id,
                            companyNames,
                            patch.user_id
                        )
                        console.log(`  ✅ 更新成功`)
                    } else {
                        console.log(`  🔍 [DRY RUN] 将会添加公司: ${companyNames.join(', ')}`)
                    }

                    stats.success++
                }
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error)
                if (error instanceof NextMoeError && error.status === 404) {
                    console.log(`  ⚠️  NextMoe 未找到该作品，跳过`)
                    stats.skipped++
                } else if (error instanceof NextMoeError && error.status === 400) {
                    console.error(`  ❌ NextMoe 作品 ID 无效，跳过: ${message}`)
                    stats.failed++
                    stats.failedIds.push({
                        patchId: patch.id,
                        vndbId: patch.vndb_id!,
                        error: message
                    })
                } else if (error instanceof NextMoeError && error.status === 429) {
                    const remaining = patches.length - (i + 1)
                    console.error(`  ❌ NextMoe 限流，已重试 ${RATE_LIMIT_RETRIES} 次，停止后续请求（未处理 ${remaining} 个）: ${message}`)
                    stats.failed++
                    stats.failedIds.push({
                        patchId: patch.id,
                        vndbId: patch.vndb_id!,
                        error: message
                    })
                    break
                } else {
                    console.error(`  ❌ 处理失败: ${message}`)
                    stats.failed++
                    stats.failedIds.push({
                        patchId: patch.id,
                        vndbId: patch.vndb_id!,
                        error: message
                    })
                }
            }

            if (i < patches.length - 1) {
                console.log(`  ⏸️  等待 2 秒后继续...`)
                await delay(2000)
            }
        }

        console.log('\n' + '='.repeat(60))
        console.log('📊 更新完成统计')
        console.log('='.repeat(60))
        console.log(`总计游戏: ${stats.total}`)
        console.log(`✅ 成功: ${stats.success}`)
        console.log(`⚠️  跳过: ${stats.skipped}`)
        console.log(`❌ 失败: ${stats.failed}`)

        if (stats.failedIds.length > 0) {
            console.log('\n失败列表:')
            stats.failedIds.forEach(({ patchId, vndbId, error }) => {
                console.log(`  - 游戏 ID: ${patchId}, VNDB: ${vndbId}`)
                console.log(`    错误: ${error}`)
            })
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('\n💥 脚本执行出错:', message)
        throw error
    } finally {
        await prisma.$disconnect()
    }

    return stats
}

const args = process.argv.slice(2)
const limitIndex = args.indexOf('--limit')
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : undefined
const dryRun = args.includes('--dry-run')

updateGameCompanies(limit, dryRun)
    .then((stats) => {
        if (stats.failed > 0) {
            console.error(`\n💥 有 ${stats.failed} 个游戏更新失败`)
            process.exit(1)
        }
        console.log('\n✨ 脚本执行完成')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 脚本执行失败:', error)
        process.exit(1)
    })
