import path from 'node:path'
import chalk from 'chalk'
import { emitter, Events } from '@this/gc'
import { type Context, processArguments, Routes, mask } from '@this/arguments'
import { Dirs, dumpD, Exits, log } from '@this/configuration'
import { execute as executeTranslate } from './command.translate'
import { createFile } from './utils'

export const initialize = async (args: string[]): Promise<void> => {
  const context: Context = await processArguments(args)
  dumpD(`initialize context: %O`, mask(context))

  // create session log, save execution command
  const logFile = path.resolve(Dirs.local, context.flags.session, 'exec.log')
  const logContent = `Command:\n\n${args.join(' \\\n\t')}\n\nParsed Arguments:\n\n${JSON.stringify(mask(context.flags), null, 2)}\n\n`
  await createFile(logContent, logFile)
  log(`Execution log saved to: %s`, chalk.yellowBright(logFile))

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
