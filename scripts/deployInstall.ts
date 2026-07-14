import { chmodSync, existsSync, mkdirSync } from 'fs'
import { execFileSync } from 'child_process'

const runCommand = (command: string, args: string[]) => {
  try {
    console.log(`Running command: ${command} ${args.join(' ')}`)
    execFileSync(command, args, { stdio: 'inherit' })
  } catch (error) {
    console.error(`Error running command: ${command} ${args.join(' ')}`)
    process.exit(1)
  }
}

runCommand('pnpm', ['install', '--frozen-lockfile'])

runCommand('pnpm', ['db:check-version'])
runCommand('pnpm', ['prisma:push'])

if (!existsSync('./uploads')) {
  mkdirSync('./uploads')
}
// 只让运行进程的所属用户和组读写,移除 world-write/exec
chmodSync('./uploads', 0o770)
