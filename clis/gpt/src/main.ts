import { emitter, Events } from '@this/gc'
import { type Context, processArguments, Routes, mask } from '@this/arguments'
import { dumpD, Exits } from '@this/configuration'
import { execute as executeTranslate } from './command.translate'

export const initialize = async (args: string[]): Promise<void> => {
  const context: Context = await processArguments(args)
  dumpD(`initialize context: %O`, mask(context))

  emitter.emit(Events.main, context)
}
export const main = async (context: Context): Promise<void> => {
  // TODO (olku): implement gpt requests
  dumpD(`main context: %O`, mask(context))

  switch (context.flags.command) {
    case Routes.translate:
      await executeTranslate(context)
      break

    default:
      throw new Error(`Unknown command: ${context.flags.command}`)
  }

  // shutdown app, all done!
  emitter.emit(Events.exit, Exits.success.code)
}
