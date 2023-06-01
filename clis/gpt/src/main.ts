import { emitter, Events } from '@this/gc'
import { processArguments, type Context } from '@this/arguments'
import { dumpD, Exits } from '@this/configuration'

export const initialize = async (args: string[]): Promise<void> => {
  const context: Context = await processArguments(args)
  dumpD(`context: %O`, context)

  emitter.emit(Events.main, context)
}
export const main = async (context: Context): Promise<void> => {
  // TODO (olku): implement gpt requests
  dumpD(`main context: %o`, context)

  // shutdown app, all done!
  emitter.emit(Events.exit, Exits.success.code)
}
