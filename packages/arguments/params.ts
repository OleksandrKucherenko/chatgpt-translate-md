import { type Commands, type Predefined, type Questions, Secured, SuggestDirs, type Switches } from './types'
import { GlobalFlags, TranslateFlags } from './routes'

/** Values of the parameters extracted from global environment. */
export const Defaults: Predefined = {
  // for boolean values required trick string-to-boolean conversion
  ask: [!Boolean(process.env.CI), true],
  token: [process.env.OPENAI_API_TOKEN, `<token>`],
  source: ['**/*.md', `<glob>`],
  language: [`Ukrainian`, `<language>`],
  overwrite: [false],
  debug: [false],
  cwd: [process.cwd()],
}

/** User friendly questions. */
export const Prompts: Questions = {
  source: {
    message: `Source files glob or file path (ex. ./**/*.md):`,
  },
  overwrite: {
    message: `Overwrite source files or compose with language extension?`,
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
  overwrite: {
    alias: [`o`, `replace`],
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
    options: [TranslateFlags.source, TranslateFlags.overwrite, TranslateFlags.language],
    questions: [GlobalFlags.cwd, TranslateFlags.source, TranslateFlags.overwrite, TranslateFlags.language],
  },
}
