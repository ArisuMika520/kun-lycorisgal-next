const path = require('path')

module.exports = {
  apps: [
    {
      name: 'kun-touchgal-next',
      port: 3000,
      cwd: path.join(__dirname),
      instances: 2,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      script: './.next/standalone/server.js',
      // https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
        PORT: 3000,
        // 服务器无 IPv6 路由，强制 DNS 解析优先返回 IPv4，
        // 否则 axios 命中 AAAA 记录会一直 TCP 超时 (ETIMEDOUT)。
        NODE_OPTIONS: '--dns-result-order=ipv4first'
      }
    }
  ]
}
