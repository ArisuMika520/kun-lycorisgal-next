import { PrismaClient } from '@prisma/client'

const REQUIRED_POSTGRES_VERSION = '17.0'
const prisma = new PrismaClient()

const main = async () => {
  const rows = await prisma.$queryRaw<Array<{ serverVersion: string }>>`
    SELECT current_setting('server_version') AS "serverVersion"
  `
  const serverVersion = rows[0]?.serverVersion
  const normalizedVersion = serverVersion?.match(/^\d+\.\d+/)?.[0]

  if (normalizedVersion !== REQUIRED_POSTGRES_VERSION) {
    throw new Error(
      `PostgreSQL ${REQUIRED_POSTGRES_VERSION} is required; connected server reports ${serverVersion ?? 'unknown'}`
    )
  }

  console.log(`PostgreSQL version verified: ${serverVersion}`)
}

main()
  .catch((error) => {
    console.error('PostgreSQL version check failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
