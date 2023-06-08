import path from 'node:path'
import { v4 as uuid } from 'uuid'

import { Dirs } from '@this/configuration'
import { GlobalFlags, TranslateFlags } from './routes'
import { type Commands, type Predefined, type Questions, Secured, SuggestDirs, type Switches } from './types'

/** Values of the parameters extracted from global environment. */
export const Defaults: Predefined = {
  // for boolean values required trick string-to-boolean conversion
  // eslint-disable-next-line no-extra-boolean-cast
  ask: [!Boolean(process.env.CI), true],
  token: [process.env.OPENAI_API_TOKEN, `<token>`],
  source: [`**/*.md`, `<glob>`],
  ignore: [`**/*.ukrainian.md`, `<glob>`],
  language: [`Ukrainian`, `<language>`],
  overwrite: [false],
  debug: [false],
  cwd: [process.cwd(), `<dir_path>`],
  list: [false],
  session: [uuid()],
  template: [path.relative(Dirs.root, path.resolve(Dirs.assets, `markdown-simple.v1.handlebars`)), `<file_path>`],
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
  template: {
    message: `ChatGPT Prompt template file (ex. markdown-simple.v1.handlesbars, ../custom.handlesbars):`,
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
    alias: [`list-of-files`],
    describe: `Treat source as a list of files/globs`,
    type: `boolean`,
    defaultDescription: `false`,
  },
  ignore: {
    alias: `i`,
    describe: `Exclude source files from processing by glob`,
  },
  overwrite: {
    alias: [`replace`, `force`],
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
  template: {
    alias: [`prompt`],
    describe: `ChatGPT Prompt template file (relative to monorepo root folder or full path).`,
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
      TranslateFlags.template,
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
