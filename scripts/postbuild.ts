import { execSync } from 'child_process'
import { mkdir, readdir, copyFile } from 'fs/promises'
import path from 'path'
import os from 'os'

const isWindows: boolean = os.platform() === 'win32'

const copyDirectory = async (src: string, dest: string): Promise<void> => {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    } else {
      await copyFile(srcPath, destPath)
    }
  }
}

// Next.js standalone server.js 会在启动时 chdir 到自己所在目录,
// 所以任何 `process.cwd() + 相对路径` 在生产都指向 `.next/standalone/...`。
// 这些目录必须随 postbuild 拷贝进去,否则:
//   - posts:          首页 carousel 渲染时 `posts[0].title` 抛错
//   - config:         管理后台读 redirect 配置 404
//   - server/image:   注册验证码图源 ENOENT
const RUNTIME_ASSET_DIRS = ['posts', 'config', 'server/image'] as const

const main = async () => {
  // 1) sitemap
  console.log('[postbuild] Generating sitemap...')
  execSync('pnpm build:sitemap', { stdio: 'inherit' })

  // 2) standalone 静态资产 —— 必须等它真的拷完,否则 pm2 restart 之后会 404,
  //    前端表现为"组件丢失 / 只剩纯文本"(React 无法 hydrate)。
  if (isWindows) {
    console.log('[postbuild] Detected Windows, copying via fs.')
    await copyDirectory('public', '.next/standalone/public')
    await copyDirectory('.next/static', '.next/standalone/.next/static')
    for (const dir of RUNTIME_ASSET_DIRS) {
      await copyDirectory(dir, `.next/standalone/${dir}`)
    }
  } else {
    console.log('[postbuild] Copying standalone assets via cp.')
    execSync('cp -r public/. .next/standalone/public/', { stdio: 'inherit' })
    execSync('cp -r .next/static .next/standalone/.next/', { stdio: 'inherit' })
    for (const dir of RUNTIME_ASSET_DIRS) {
      execSync(
        `mkdir -p .next/standalone/${dir} && cp -r ${dir}/. .next/standalone/${dir}/`,
        { stdio: 'inherit' }
      )
    }
  }

  console.log('[postbuild] Done.')
}

main().catch((err) => {
  console.error('[postbuild] Failed:', err)
  process.exit(1)
})
