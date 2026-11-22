import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vite = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const child = spawn(process.execPath, [vite, ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
})

let stopping = false

child.on('error', (error) => {
  console.error(`Frontend failed to start: ${error.message}`)
  stop(1)
})

child.on('exit', (code, signal) => {
  if (stopping) return
  console.error(
    `Frontend stopped${signal ? ` (${signal})` : ` with exit code ${code}`}.`
  )
  stop(code || 1)
})

function stop(exitCode) {
  if (stopping) return
  stopping = true
  process.exitCode = exitCode

  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill()
  }
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
