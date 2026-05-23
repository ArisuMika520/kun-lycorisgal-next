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
    'isomorphic-dompurify',
    // undici 源码用 node: scheme imports (node:console / node:crypto 等),
    // webpack 不识别;且 instrumentation.ts 仅在服务端执行,直接 require。
    'undici'
  ],

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
