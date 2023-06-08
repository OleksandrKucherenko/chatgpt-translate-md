import path from 'node:path'
import chalk from 'chalk'

import { emitter, Events } from '@this/gc'
import { type Context, type RichContext, processArguments, Routes, mask } from '@this/arguments'
import { Dirs, dumpD, Exits } from '@this/configuration'
import { metrics } from '@this/telemetry'
import { execute as executeTranslate } from './command.translate'
import { createFile } from './utils'
import { onSuccess } from './ui'

export const initialize = async (args: string[]): Promise<void> => {
  const context: Context = await processArguments(args)
  dumpD(`initialize context: %O`, mask(context))

  // create enhanced context with statistics tracking
  const enhanced: RichContext = { ...context, stats: metrics(context.flags.session) }

  // create session log, save execution command
  const logFile = path.resolve(Dirs.local, context.flags.session, `exec.log`)
  const logContext = JSON.stringify(mask(context.flags), null, 2)
  const logContent = `Command:\n\n${args.join(` \\\n\t`)}\n\nParsed Arguments:\n\n${logContext}\n\n`
  await createFile(logContent, logFile)
  onSuccess(`Execution log saved to: ${chalk.yellowBright(logFile)}`)

  // initialization done, time to run main code
  emitter.emit(Events.main, enhanced)
}

export const main = async (context: RichContext): Promise<void> => {
  dumpD(`main context: %O`, mask(context))

  // execute selected command
  switch (context.flags.command) {
    case Routes.translate:
      await executeTranslate(context)
      break

    // TODO (olku): implement other commands

    default:
      throw new Error(`Unknown command: ${context.flags.command}`)
  }

  // shutdown app, all done!
  emitter.emit(Events.exit, Exits.success.code)
}
