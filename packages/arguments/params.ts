import { type Commands, type Predefined, type Questions, Secured, SuggestDirs, type Switches } from './types'
import { GlobalFlags, TranslateFlags } from './routes'
import { v4 as uuid } from 'uuid'

/** Values of the parameters extracted from global environment. */
export const Defaults: Predefined = {
  // for boolean values required trick string-to-boolean conversion
  ask: [!Boolean(process.env.CI), true],
  token: [process.env.OPENAI_API_TOKEN, `<token>`],
  source: ['**/*.md', `<glob>`],
  ignore: ['**/*.ukrainian.md', `<glob>`],
  language: [`Ukrainian`, `<language>`],
  overwrite: [false],
  debug: [false],
  cwd: [process.cwd()],
  list: [false],
  session: [uuid()],
}

/** User friendly questions. */
export const Prompts: Questions = {
  source: {
    message: `Source files, glob or file path (ex. ./**/*.md):`,
  },
  list: {
    message: `Is source contains a list files/globs:`,
    type: `toggle`,
    active: `yes`,
    inactive: `no`,
  },
  ignore: {
    message: `Ignore files (ex. ./**/*.ukrainian.md, /**):`,
  },
  overwrite: {
    message: `Overwrite source files?`,
    type: `toggle`,
    active: `yes`,
    inactive: `no`,
  },
  language: {
    message: `Target language in Human readable form (ex. Ukrainian, Spanish, Swedish):`,
  },
  token: {
    message: `OpenAI ChatGPT API Access Token (sk-xxxx):`,
  },
  cwd: SuggestDirs.from({
    message: `Current working directory (ex. ~/project, ../project, ./project):`,
  }),
}

/** Configuration of all available flags/switches. */
export const Options: Switches = {
  source: {
    alias: `s`,
    describe: `Source files glob`,
  },
  list: {
    alias: [`l`, `source-list`],
    describe: `Treat source as a list of files/globs`,
    type: `boolean`,
  },
  ignore: {
    alias: `i`,
    describe: `Exclude source files from processing by glob`,
  },
  overwrite: {
    alias: [`o`, `replace`, `force`, `f`],
    describe: `Boolean, overwrite source files or compose with language extension.`,
    type: `boolean`,
    defaultDescription: `false`,
  },
  language: {
    alias: [`l`, `lang`, `target-language`],
    describe: `Target language in Human readable form.`,
  },
  token: Secured.from({
    alias: `t`,
    describe: `OpenAI ChatGPT API Access Token`,
    // add description to mask real secured value
    defaultDescription: `$OPENAI_API_TOKEN`,
  }),
  ask: {
    alias: [`interactive`],
    describe: `Interactive Mode. Use --no-ask to enable CI mode or set environment variable CI.`,
    type: `boolean`,
    defaultDescription: `not($CI)`,
  },
  debug: {
    describe: `Debug Mode. Force verbose output of the tool internals.`,
    type: `boolean`,
    defaultDescription: `false`,
  },
  cwd: {
    describe: `Current working directory for file search operations. Defaults to process.cwd().`,
  },
}

/** Yargs commands configuration. */
export const Yargs: Commands = {
  translate: {
    aliases: [`$0`],
    description: `Translate file(s) from one language to another over ChatGPT`,
    options: [
      TranslateFlags.language,
      TranslateFlags.source,
      TranslateFlags.list,
      TranslateFlags.ignore,
      TranslateFlags.overwrite,
    ],
    questions: [
      TranslateFlags.language,
      GlobalFlags.cwd,
      TranslateFlags.source,
      TranslateFlags.list,
      TranslateFlags.ignore,
      TranslateFlags.overwrite,
    ],
  },
}

// TODO (olku): user should provide or source or
