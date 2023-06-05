import * as gpt from 'openai'
import fs from 'node:fs/promises'
import path from 'node:path'
import { v4 as uuid } from 'uuid'
import { PromisePool } from '@supercharge/promise-pool'
import { Dirs, Exits, log } from '@this/configuration'
import { appendFile, createFile, isFileExists } from './utils'
import { ChunkError, Content, type DocumentStrategy, type JobContext } from './types'
import { Markdown } from './markdown'
import { withUI } from './ui'

/** How many chunks process at the same time. */
export const MAX_CONCURRENCY_CHUNKS = 5

enum Errors {
  SameContent = '⛔ The result of translation was same as the existed output file.',
  EmptyContent = '⛔ The result of translation was empty.',
  Unsupported = `⛔ Unsupported file type.`,
  Failed = `⛔ Translation failed.`,
}

const MODEL = 'gpt-3.5-turbo'

const MSG_SYSTEM_PROMPT = {
  role: gpt.ChatCompletionRequestMessageRoleEnum.System,
}

const MSG_USER_CONTENT = { role: gpt.ChatCompletionRequestMessageRoleEnum.User }

type TranslateResult = {
  translated: string
  contentChunks: Content
  translatedChunks: Content
}

type TranslateFileResult = {
  content: string
  translated: string
}

export const selectStrategy = (file: string): DocumentStrategy => {
  if (file.endsWith(Markdown.extension)) return Markdown

  throw new Error(Errors.Unsupported, { cause: file })
}

export const createGptClient = (apiKey: string) => {
  const configuration = new gpt.Configuration({ apiKey })

  return new gpt.OpenAIApi(configuration)
}

export const askGPT = async (text: string, prompt: string, context: JobContext): Promise<string> => {
  const openAIApi = createGptClient(context.flags.token)

  const query = {
    model: MODEL,
    messages: [
      { ...MSG_SYSTEM_PROMPT, content: prompt },
      { ...MSG_USER_CONTENT, content: text },
    ],
    top_p: 0.5,
  }

  const { data } = await openAIApi.createChatCompletion(query)

  const {
    choices: [{ message: { content: content } = { content: '' } }],
  } = data

  // TODO (olku): extract statistics from response, inject it into context

  if (content === '') throw new Error(Errors.EmptyContent)

  return content
}

/** compose log file for each ChatGpt call, used unique UUID. */
export const askGPTWithLogger = async (text: string, prompt: string, context: JobContext): Promise<string> => {
  const { session } = context.flags
  const reportFile = path.resolve(Dirs.local, session, `${uuid()}.log`)
  const logs = `${MODEL}:\n----\n${prompt}\n----\n${text}\n----\n`

  await createFile(logs, reportFile)

  try {
    const content = await askGPT(text, prompt, context)
    await appendFile(`Answer:\n\n${content}\n----\n`, reportFile)

    return content
  } catch (error: any) {
    const errorLog = `Error:\n\n${JSON.stringify(error, null, 2)}\n----\n`
    await appendFile(errorLog, reportFile)

    // TODO (olku): add into error log file hint how to execute tool with
    //  failed file only, without other files

    error.log = reportFile
    throw error
  }

  // TODO (olku): generated log file should be displayed to user
}

export const reportErrors = async (errors: ChunkError[], context: JobContext) => {
  if (errors.length === 0) return

  const { source, destination } = context.job
  log(`⛔ Translation failed for ${source} -> ${destination}`)

  throw new Error(Errors.Failed, { cause: Exits.errors.code })
}

export const translate = async (content: string, context: JobContext): Promise<TranslateResult> => {
  const { composePrompt, composeChunks, mergeResults } = selectStrategy(context.job.source)

  const prompt = composePrompt(context)
  const contentChunks = composeChunks({ content, context })

  const pool = await withUI(context, PromisePool.for(contentChunks.chunks))
    .withConcurrency(MAX_CONCURRENCY_CHUNKS)
    .useCorrespondingResults()
    .process(async (chunk) => {
      return askGPTWithLogger(chunk, prompt, context)
    })

  const { results, errors } = pool
  await reportErrors(errors, context)

  // if one of the sections failed, replace it with the original text
  const translated = mergeResults({ results, context })

  return {
    translated,
    contentChunks,
    translatedChunks: { chunks: results as string[], tokens: -1, length: translated.length },
  }
}

export const translateFile = async (context: JobContext): Promise<TranslateFileResult> => {
  const { source, destination } = context.job
  const content = await fs.readFile(source, 'utf-8')
  const { translated } = await translate(content, context)

  // Check if the translation is same as the original
  if (await isFileExists(destination)) {
    const fileContent = await fs.readFile(destination, 'utf-8')

    if (fileContent === translated) throw new Error(Errors.SameContent)
  }

  await createFile(translated, destination)

  return { content, translated }
}