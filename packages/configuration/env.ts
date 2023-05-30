import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import { existsSync } from 'node:fs'

const NODE_ENV = process.env.NODE_ENV ?? `development`

export const environmentFiles = (): string[] => {
  const files = [`.env.${NODE_ENV}.local`, NODE_ENV !== `test` && `.env.local`, `.env.${NODE_ENV}`, `.env`].filter(
    Boolean
  )

  return (files as string[]).filter((path) => existsSync(path))
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
})

export type ExitsType = typeof Exits.success
