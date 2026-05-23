// import { fileURLToPath } from 'url'
import { env } from './validations/dotenv-check'
import createMDX from '@next/mdx'
import type { NextConfig } from 'next'
// import remarkGfm from 'remark-gfm'
// import rehypeSlug from 'rehype-slug'
// import rehypeAutolinkHeadings from 'rehype-autolink-headings'
// import rehypePrettyCode from 'rehype-pretty-code'

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  devIndicators: false,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  transpilePackages: ['next-mdx-remote'],
  publicRuntimeConfig: {
    NODE_ENV: env.data!.NODE_ENV
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: {
    ignoreBuildErrors: true
  },
  sassOptions: {
    silenceDeprecations: ['legacy-js-api']
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: env.data!.KUN_VISUAL_NOVEL_IMAGE_BED_HOST,
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'img.touchgalstatic.org',
        port: '',
        pathname: '/**'
      }
    ]
  },
  serverExternalPackages: [
    'puppeteer',
    'puppeteer-core',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    // jsdom 内部用 __dirname 读 default-stylesheet.css 等静态资源,
    // standalone 打包后 __dirname 被改写,文件找不到 → ENOENT。
    // isomorphic-dompurify 服务端会 require jsdom,一并标外。
    'jsdom',
    'isomorphic-dompurify'
  ],

  // instrumentation.ts 启动时需要 undici 来设置 IPv4-only dispatcher
  // (服务器无 IPv6 出站,详见 instrumentation.ts 注释)。但 undici 源码
  // 用 node:console / node:crypto 等 scheme imports,webpack 不识别会
  // 报 UnhandledSchemeError。这里在 server 端把 undici 标为 external,
  // webpack 输出 require('undici') 由 Node 运行时解析;nft 看到 require
  // 调用,会自动把 undici 包 trace 到 .next/standalone/node_modules/。
  // serverExternalPackages 不覆盖 instrumentation 的编译,所以必须走
  // 这层 webpack config。
  webpack: (config, { isServer }) => {
    if (isServer) {
      const undiciExternal = { undici: 'commonjs undici' }
      const existing = config.externals
      if (Array.isArray(existing)) {
        config.externals = [...existing, undiciExternal]
      } else if (existing) {
        config.externals = [existing, undiciExternal]
      } else {
        config.externals = [undiciExternal]
      }
    }
    return config
  },

  output: 'standalone',
  experimental: {
    // turbotrace: {
    //   logLevel: 'error',
    //   logDetail: false,
    //   contextDirectory: path.join(__dirname, '/'),
    //   memoryLimit: 1024
    // }
  }
}

// Turbopack compatible errors
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // remarkPlugins: [remarkGfm],
    rehypePlugins: [
      // rehypeSlug,
      // [
      //   rehype - autolink - headings,
      //   {
      //     properties: {
      //       className: ['anchor'],
      //     },
      //   },
      // ],
      // [
      //   rehypePrettyCode,
      //   {
      //     theme: 'github-dark',
      //   },
      // ],
    ]
  }
})

export default withMDX(nextConfig)
