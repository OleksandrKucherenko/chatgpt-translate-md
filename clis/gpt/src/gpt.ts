import * as gpt from 'openai'
import ora from 'ora'
import fs from 'fs/promises'
import { encode } from 'gpt-3-encoder'
import { log, logD } from '@this/configuration'
import { createFile, isFileExists } from './utils'
import { composeAtomicCounter, increment } from '@this/gc'

export const MARKDOWN_SPLITTER = `\n\n`

export const MAX_TOKENS = 2000

export const ERROR_SAME_CONTENT = '⛔ The result of translation was same as the existed output file.'

const MODEL = 'gpt-3.5-turbo'

const MSG_SYSTEM_PROMPT = {
  role: gpt.ChatCompletionRequestMessageRoleEnum.System,
}

const MSG_USER_CONTENT = { role: gpt.ChatCompletionRequestMessageRoleEnum.User }

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '<secret>'

export type Options = { maxToken: number; splitter: string }

export const DefaultOptions: Options = { maxToken: MAX_TOKENS, splitter: MARKDOWN_SPLITTER }

export const createGptClient = (apiKey: string) => {
  const configuration = new gpt.Configuration({ apiKey })

  return new gpt.OpenAIApi(configuration)
}

export const composePrompt = (language: string): string => {
  // TODO: Improve prompt (trusting user input currently)
  // https://raw.githubusercontent.com/smikitky/markdown-gpt-translator/main/prompt-example.md

  /**
   * I am translating the React documentation for %%%%%.
   * Please translate the Markdown content I'll paste later to %%%%%.
   *
   * You must strictly follow the rules below.
   *
   * - Never change the Markdown markup structure. Don't add or remove links. Do not change any URL.
   * - Never change the contents of code blocks even if they appear to have a bug. Importantly, never
   *    touch lines containing the `omittedCodeBlock-xxxxxx` keyword.
   * - Always preserve the original line breaks. Do not add or remove blank lines.
   * - Never touch the permalink such as `{ try-react }` at the end of each heading.
   * - Never touch HTML-like tags such as `<Notes>` or `<YouWillLearn>`.
   */

  return `Please translate the given text into ${language} and output it in markdown format.`
}

export const askGPT = async (text: string, prompt: string): Promise<string> => {
  const openAIApi = createGptClient(OPENAI_API_KEY)

  const {
    data: {
      choices: [{ message: { content: content } = { content: '' } }],
    },
  } = await openAIApi.createChatCompletion({
    model: MODEL,
    messages: [
      { ...MSG_SYSTEM_PROMPT, content: prompt },
      { ...MSG_USER_CONTENT, content: text },
    ],
    top_p: 0.5,
  })

  if (content === '') log('⛔ Translation result is empty')

  return content
}

export const optimizeChunks = (text: string, options?: Options) => {
  const { maxToken, splitter } = { ...DefaultOptions, ...options }
  const chunks = text.split(splitter)

  logD(`Potential chunks: %o content length: %o`, chunks.length, text.length)

  let chunkIndex = 0
  let delimiter = ''
  const merged = chunks.reduce(
    (prev, current) => {
      const prevChunk = prev[chunkIndex]
      const testChunk = prevChunk + delimiter + current

      if (encode(testChunk).length > maxToken) {
        return { ...prev, [++chunkIndex]: current }
      }

      const next = { ...prev, [chunkIndex]: testChunk }
      delimiter = splitter

      return next
    },
    ['']
  )

  // count total number of used tokens
  const totalTokens = merged.reduce((prev, chunk) => prev + encode(chunk).length, 0)
  logD(`Chunks: %o vs. %o, tokens: %o`, chunks.length, merged.length, totalTokens)

  return merged
}

export const translate = async (content: string, language: string): Promise<string> => {
  log('Start translating...')
  const chunks = optimizeChunks(content)
  const executed = composeAtomicCounter()
  const prompt = composePrompt(language)
  const jobs = chunks.map((chunk) => increment(executed, askGPT(chunk, prompt)))

  const spinner = ora('Translating...').start()
  const updater = setInterval(() => (spinner.text = `Translating... ${executed.counter[0]}/${chunks.length}`), 1000)
  const translations = await Promise.allSettled(jobs)
  clearInterval(updater)
  spinner.succeed('Translation completed!')

  // if one of the sections failed, replace it with the original text
  const translated = translations
    .map((f, index) => (f.status === 'fulfilled' ? f.value : chunks[index]))
    .join(MARKDOWN_SPLITTER)

  logD('translations: %O', translations)
  logD('extracted: %O', translated)

  return translated
}

export const translateFile = async (source: string, destination: string, language: string) => {
  const content = await fs.readFile(source, 'utf-8')
  const translated = await translate(content, language)

  // Check if the translation is same as the original
  if (await isFileExists(destination)) {
    const fileContent = await fs.readFile(destination, 'utf-8')

    if (fileContent === translated) throw new Error(ERROR_SAME_CONTENT)
  }

  await createFile(translated, destination)

  return translated
}
