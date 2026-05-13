import { existsSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'

const runCommand = (command: string) => {
  try {
    console.log(`Running command: ${command}`)
    execSync(command, { stdio: 'inherit' })
  } catch (error) {
    console.error(`Error running command: ${command}`)
    process.exit(1)
  }
}

runCommand('pnpm install')

runCommand('pnpx prisma db push')

if (!existsSync('./uploads')) {
  mkdirSync('./uploads')
}
// 只让运行进程的所属用户和组读写,移除 world-write/exec
runCommand('chmod 770 uploads')
