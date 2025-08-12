const path = require('path')

module.exports = {
  apps: [
    {
      name: 'kun-touchgal-next',
      port: 3000,
      cwd: path.join(__dirname),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      script: './.next/standalone/server.js',
      // https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0',
        PORT: 3000
      }
    }
  ]
}
