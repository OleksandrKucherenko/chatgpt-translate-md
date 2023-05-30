import { Arguments } from './types'

export interface TypedArguments extends Arguments {
  // TODO (olku): add typed arguments from yargs
  source: string
  overwrite: boolean
  language: string
}

/** initial context, with parsed command line arguments. */
export interface Context {
  flags: TypedArguments
}

export interface Storage {
  // TODO (olku): add database/storage specific context
}

export interface RichContext extends Context, Storage {}
