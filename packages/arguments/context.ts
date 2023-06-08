import type { Arguments } from './types'
import { type Metrics } from '@this/telemetry'

export interface TypedArguments extends Arguments {
  // TODO (olku): add typed arguments from yargs
  cwd: string
  source: string
  ignore: string
  list: boolean
  overwrite: boolean
  language: string
  sourceList: string
  token: string
  template: string
}

/** initial context, with parsed command line arguments. */
export interface Context {
  flags: TypedArguments
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Storage {
  // TODO (olku): add database/storage specific context
}

export interface Statistics {
  readonly stats: Metrics
}

export interface RichContext extends Context, Storage, Statistics {}
