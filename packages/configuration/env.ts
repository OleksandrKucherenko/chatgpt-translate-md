import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import { existsSync } from 'node:fs'
import { logD } from './logs'
import findConfig from 'find-config'
import path from 'node:path'

const NODE_ENV = process.env.NODE_ENV ?? `development`
const CWD = process.cwd()
const ROOT = (findConfig(`.env`, { cwd: CWD }) ?? ``).replace(/\.env$/, ``)

logD(`node environment: %o`, NODE_ENV)
logD(`exec directory: %o`, CWD)

export const environmentFiles = (): string[] => {
  const files = [
    `.env.${NODE_ENV}.local`,
    /* do not load local for TEST executions. */
    NODE_ENV !== `test` && `.env.local`,
    `.env.${NODE_ENV}`,
    `.env`,
  ].filter(Boolean)

  return (files as string[]).map((file) => path.resolve(ROOT ?? CWD, file)).filter((path) => existsSync(path))
}

environmentFiles().forEach((path) => {
  expand(config({ path }))
})

/** Known to application error codes. */
export const Exits = Object.freeze({
  /** All done as requested. */
  success: { name: `Success`, code: 0 },
  /** Aborted by user operation. */
  abort: { name: `Aborted by User`, code: 1 },
  /** Unhandled exception. */
  unhandled: { name: `Unknown Error`, code: 2 },
  /** Gracefully shutdown. */
  termination: { name: `Terminated`, code: 3 },
  /** Errors during processing. */
  errors: { name: `Errors`, code: 4 },
})

export type ExitsType = typeof Exits.success
