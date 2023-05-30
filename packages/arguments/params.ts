import { type Commands, type Predefined, type Questions, Secured, type Switches } from './types'
import { GlobalFlags } from './routes'

/** Values of the parameters extracted from global environment. */
export const Defaults: Predefined = {
  ask: [process.env.CI, true],
  token: [process.env.OPENAI_API_TOKEN, `<token>`],
}

/** User friendly questions. */
export const Prompts: Questions = {
  source: {
    message: `Source files glob (ex. ./**/*.md):`,
  },
  overwrite: {
    message: `Overwrite source files or compose with language extension? [y/n]:`,
  },
  language: {
    message: `Target language in Human readable form (ex. Ukrainian, Spanish, Swedish):`,
  },
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
  },
  language: {
    alias: [`l`, `lang`, `target-language`],
    describe: `Target language in Human readable form.`,
  },
  token: Secured.from({
    alias: `t`,
    describe: `OpenAI ChatGPT API Access Token`,
    // add description to mask real secured value
    defaultDescription: `OPENAI_API_TOKEN`,
  }),
  ask: {
    alias: [`interactive`],
    describe: `Interactive Mode. Use --no-ask to enable CI mode or set environment variable CI.`,
    type: `boolean`,
  },
}

/** Yargs commands configuration. */
export const Yargs: Commands = {
  translate: {
    aliases: [`$0`],
    description: `Translate file(s) from one language to another over ChatGPT`,
    options: [],
    questions: [GlobalFlags.token],
  },
}
