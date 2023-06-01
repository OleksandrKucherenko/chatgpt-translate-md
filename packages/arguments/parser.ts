import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'
import prompts from 'prompts'
import MaskData from 'maskdata'

import { dumpD, log, logW, Exits } from '@this/configuration'

import { Defaults, Options, Prompts, Yargs } from './params'
import { type Command, type Extras, type Predefined, type Question, type Switch } from './types'
import { type AllFlags, ApplicationName, ApplicationVersion, GlobalFlags, Routes } from './routes'
import { type Context, type TypedArguments } from './context'

const mask = <T extends object>(data: T) => {
  const options = {
    passwordFields: [`token`, `t`, `flags.token`, `flags.t`, `token[0]`],
    passwordMaskOptions: { maskWith: `*`, unmaskedStartCharacters: 3, unmaskedEndCharacters: 4 },
  }
  return MaskData.maskJSON2(data, options)
}

const resolveDefaults = (defaults: Predefined): TypedArguments => {
  const entries = Object.entries(defaults).map(([name, values]) => {
    const value = values.find((a) => a != null && typeof a !== `undefined`)

    return [name, value]
  })

  return Object.fromEntries(entries) as TypedArguments
}

const removeUndefined = <T extends object>(data: T): T =>
  Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}) as T

const resolveOption = (name: AllFlags, option: Switch, defaults: Predefined, extras: Extras): Switch => {
  const resolved = resolveDefaults(defaults)
  const { type = `string`, ...other } = option

  const value = [resolved[name]].find(Boolean)

  return {
    type,
    ...other,
    default: value,
    ...extras,
  }
}

const configureCommands = (parser: yargs.Argv, defaults = Defaults, commands = Yargs): yargs.Argv => {
  dumpD(`defaults %O and commands %O`, mask(defaults), commands)

  let mutableParser = parser

  Object.values(Routes).forEach((command) => {
    const definition: Command = commands[command]
    const { aliases, description, options } = definition
    const names = [command, ...(aliases ?? [])]
    const entries = options
      .map((name) => {
        if (Options[name] == null) {
          logW(`option \`%s\` is missed`, name)
          return null
        }

        const resolved = resolveOption(name, Options[name] as Switch, defaults, { group: `Options for '${command}':` })

        return [name, resolved]
      })
      .filter(Boolean) as Array<[string, Switch]>
    const flags = Object.fromEntries(entries)

    mutableParser = mutableParser.command(names, description, flags, (argv) => {
      argv.command = command
    })
  })

  return mutableParser
}

const configureGlobalOptions = (parser: yargs.Argv, defaults = Defaults, options = Options): yargs.Argv => {
  dumpD(`defaults %O and options %O`, mask(defaults), options)

  let mutableParser = parser

  Object.values(GlobalFlags).forEach((name) => {
    // skip missed options
    if (options[name] == null) {
      logW(`option \`%s\` is missed`, name)
      return
    }

    mutableParser = mutableParser.option(
      name,
      resolveOption(name, options[name] as Switch, defaults, { group: `Global options:` })
    )
  })

  return mutableParser
}

/** Print all variables that we resolve and use without asking user input/confirmation. */
const reportDefaultResolutions = (_context: Context, questions: prompts.PromptObject[]): void => {
  questions.forEach((q) => {
    const isMasked = q.type === `password`
    const value = isMasked ? `*`.repeat((q.initial as string).length + 1) : q.initial

    log(`%s (%s): %s`, chalk.yellowBright(q.name), chalk.white(q.message), chalk.blue(value))
  })
}

/**
 * Yargs --> Commands --> Command --> Switches   <-- Defaults
 *                                --> Questions  <-- Defaults
 */

export const parseArguments = async (args: string[], defaults = Defaults): Promise<Context> => {
  let parser = yargs()
    .scriptName(ApplicationName)
    .version(ApplicationVersion)
    .usage(`Usage: $0 <command> [options]`)
    .showHelpOnFail(true)
    .wrap(Math.min(120, yargs([]).terminalWidth()))
    .completion(`completion`, false)
    .group([`help`, `version`], `Utilities:`)
    .strict()

  parser = configureCommands(parser, defaults)
  parser = configureGlobalOptions(parser, defaults)

  const argv: TypedArguments = (await parser.parseAsync(hideBin(args))) as unknown as TypedArguments
  const flags: TypedArguments = { ...resolveDefaults(defaults), ...removeUndefined(argv) }

  return { flags }
}

export const confirmArguments = async (context: Context, commands = Yargs, questions = Prompts): Promise<Context> => {
  dumpD(`context %O and prompts %O`, mask(context), questions)

  const {
    flags: { ask: interactive, command: execCommand },
  } = context

  log(`command mode: %s`, execCommand)

  const command = commands[execCommand]
  const toConfirm = (command.questions ?? []).map((name) => {
    if (!questions[name]) throw new Error(`Prompts are not defined for option: ${name}`)
    const { type, ...rest } = questions[name] as Question

    const obj: prompts.PromptObject = {
      name,
      type: type ?? `text`,
      ...rest,
      ...(type === `select` ? {} : { initial: context.flags[name] }),
    }

    return obj
  })
  dumpD(`to confirm %O`, toConfirm)

  if (!interactive) {
    reportDefaultResolutions(context, toConfirm)
    return context
  }

  // TODO (olku): aliases values are not updated properly
  log(`Press 'Ctrl+C' to abort`)
  const mutated = await prompts(toConfirm, {
    onCancel: () => {
      throw new Error(`${Exits.abort.name}`)
    },
  })

  return { ...context, flags: { ...context.flags, ...mutated } }
}

export const processArguments = async (args: string[], defaults = Defaults): Promise<Context> => {
  const context = await parseArguments(args, defaults)
  return await confirmArguments(context)
}
