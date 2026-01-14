
import { prisma } from '../prisma/index'
import { fetchVndbDetail } from '../app/api/spider/lib/api/vndb'
import { handleBatchPatchCompanies } from '../app/api/edit/batchCompany'

interface UpdateStats {
    total: number
    success: number
    failed: number
    skipped: number
    failedIds: { patchId: number; vndbId: string; error: string }[]
}

// 延迟函数（避免 API 限流）
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function updateGameCompanies(limit?: number, dryRun = false) {
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
                console.log(`  ⏳ 正在从 VNDB 获取数据...`)
                const vndbData = await fetchVndbDetail(patch.vndb_id!)

                if (!vndbData) {
                    console.log(`  ⚠️  无法获取 VNDB 数据，跳过`)
                    stats.skipped++
                    continue
                }

                const developers = vndbData.developers || []
                if (developers.length === 0) {
                    console.log(`  ℹ️  该游戏没有公司信息，跳过`)
                    stats.skipped++
                    continue
                }

                const companyNames = developers.map(dev => dev.name)
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

                if (i < patches.length - 1) {
                    console.log(`  ⏸️  等待 2 秒后继续...`)
                    await delay(2000)
                }

            } catch (error: any) {
                console.error(`  ❌ 处理失败: ${error.message}`)
                stats.failed++
                stats.failedIds.push({
                    patchId: patch.id,
                    vndbId: patch.vndb_id!,
                    error: error.message
                })
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

    } catch (error: any) {
        console.error('\n💥 脚本执行出错:', error.message)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

const args = process.argv.slice(2)
const limitIndex = args.indexOf('--limit')
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : undefined
const dryRun = args.includes('--dry-run')

updateGameCompanies(limit, dryRun)
    .then(() => {
        console.log('\n✨ 脚本执行完成')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 脚本执行失败:', error)
        process.exit(1)
    })
