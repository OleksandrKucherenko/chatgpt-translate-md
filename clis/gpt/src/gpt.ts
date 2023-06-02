import * as gpt from 'openai'
import ora from 'ora'
import fs from 'node:fs/promises'
import path from 'node:path'
import { encode } from 'gpt-3-encoder'
import { v4 as uuid } from 'uuid'
import { PromisePool, type OnProgressCallback } from '@supercharge/promise-pool'
import { Dirs, dumpD, log } from '@this/configuration'
import { createFile, isFileExists } from './utils'

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

  const logs = `GPT-3:\n\n${prompt}\n\n${text}\n\nAnswer:\n\n${content}\n\n`
  await createFile(logs, path.resolve(Dirs.local, `${uuid()}.log`))

  if (content === '') log('⛔ Translation result is empty')

  return content
}

type Chunked = { [key: number]: string }

const mergeChunks = (chunks: string[], options?: Options) => {
  const { maxToken, splitter } = { ...DefaultOptions, ...options }

  let chunkIndex = 0
  let delimiter = ''
  const merged: Chunked = chunks.reduce(
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
    { 0: '' } as Chunked
  )

  return Object.values(merged)
}

export const optimizeChunks = (text: string, options?: Options) => {
  const { splitter } = { ...DefaultOptions, ...options }
  const draftChunks = text.split(splitter)
  dumpD(`Potential chunks: %o content length: %o`, draftChunks.length, text.length)

  // optimize chunks by merging parts
  const chunks = mergeChunks(draftChunks, options)

  // count total number of used tokens
  const totalTokens = chunks.reduce((total, chunk) => total + encode(chunk).length, 0)
  dumpD(`Potential chunks: %o ~> %o, used tokens: %o`, draftChunks.length, chunks.length, totalTokens)

  return { chunks, totalTokens, contentLength: text.length }
}

// const delay = (ms: number) => new Promise((_) => setTimeout(_, ms))

export const translate = async (src: string, content: string, language: string): Promise<string> => {
  const startedAt = new Date()
  dumpD('Start translating...')
  const entity = optimizeChunks(content)
  const prompt = composePrompt(language)
  dumpD('prompt: %o', prompt)

  const spinner = ora(`Translating... ${src}`).start()
  const progress: OnProgressCallback<string> = (_v, pool) => {
    const active = pool.activeTaskCount()
    const processed = pool.processedCount()
    const progress = pool.processedPercentage().toFixed(1)
    const time = `${new Date().getTime() - startedAt.getTime()}ms`
    spinner.text = `Translating: ${active}|${processed}|${progress}% - ${time}`
  }
  const { results, errors } = await PromisePool.for(entity.chunks)
    .withConcurrency(5)
    .onTaskStarted(progress)
    .onTaskFinished(progress)
    .useCorrespondingResults()
    .process(async (chunk, _index) => askGPT(chunk, prompt))

  const stats = {
    content: entity.contentLength,
    tokens: entity.totalTokens,
    chunks: entity.chunks.length,
    time: `${new Date().getTime() - startedAt.getTime()}ms`,
    result: results.length,
    failed: errors.map(({ message }) => message),
  }
  if (errors.length > 0) {
    spinner.fail(`Failed ${src} with errored chunks: ${errors.length}`)

    throw new Error(`Failed chunks: ${JSON.stringify(stats.failed)}`)
  } else {
    spinner.succeed(`Processed: ${src}, ${JSON.stringify(stats)}`)
  }

  // if one of the sections failed, replace it with the original text
  const translated = results
    .map((f, index) => (f === PromisePool.failed ? entity.chunks[index] : f))
    .join(MARKDOWN_SPLITTER)

  dumpD('extracted: %O', translated)

  return translated
}

export const translateFile = async (source: string, destination: string, language: string) => {
  const content = await fs.readFile(source, 'utf-8')
  const translated = await translate(source, content, language)

  // Check if the translation is same as the original
  if (await isFileExists(destination)) {
    const fileContent = await fs.readFile(destination, 'utf-8')

    if (fileContent === translated) throw new Error(ERROR_SAME_CONTENT)
  }

  await createFile(translated, destination)

  return { source, destination, content, translated }
}
