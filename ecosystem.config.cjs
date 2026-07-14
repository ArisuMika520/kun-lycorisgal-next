const path = require('path')
const dotenv = require('dotenv')

const envPath = path.join(__dirname, '.env')
const fileEnv = dotenv.config({ path: envPath, quiet: true }).parsed || {}

module.exports = {
  apps: [
    {
      name: 'kun-touchgal-next',
      port: Number(process.env.PORT) || 3000,
      cwd: path.join(__dirname),
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      script: './.next/standalone/server.js',
      // https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
      env: {
        ...fileEnv,
        ...process.env,
        NODE_ENV: 'production',
        HOSTNAME: process.env.HOSTNAME || '127.0.0.1',
        PORT: Number(process.env.PORT) || 3000
      }
    }
  ]
}
