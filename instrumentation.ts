// Next.js 启动钩子 (server-side only)。
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export const register = async () => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // 部署服务器没有 IPv6 出站路由 (ip -6 route show default 为空)。
  // Node 内置 fetch (undici) 默认在双栈域名上可能选 v6，导致 ETIMEDOUT。
  // 这里设置全局 undici dispatcher 强制 family=4，所有 fetch 都走 IPv4。
  // 注意：axios 走 node:http/https，由 spider/_httpClient.ts 单独处理。
  //
  // undici 通过 next.config.ts 的 webpack externals 标外，运行时由 Node 直接
  // require，避免 webpack 试图打包其 node:* scheme imports。
  const { setGlobalDispatcher, Agent } = await import('undici')
  setGlobalDispatcher(new Agent({ connect: { family: 4 } }))
}
