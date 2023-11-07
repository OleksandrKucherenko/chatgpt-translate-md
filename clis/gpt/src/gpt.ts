import OpenAI from 'openai'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PromisePool } from '@supercharge/promise-pool'
import xxhash from 'xxhash-wasm'

import { Dirs, Exits } from '@this/configuration'

import { appendFile, createFile, isFileExists } from './utils'
import { type ChunkError, type Content, type DocumentStrategy, type JobContext, Kpi, Http } from './types'
import { Markdown } from './markdown'
import { onFail, withUI } from './ui'
import { inspect } from 'node:util'

/** How many chunks process at the same time. */
export const MAX_CONCURRENCY_CHUNKS = 5

/** Exception messages (for i18n). */
enum Errors {
  SameContent = `⛔ The result of translation was same as the existed output file.`,
  EmptyContent = `⛔ The result of translation was empty.`,
  Unsupported = `⛔ Unsupported file type.`,
  ApiError = `⛔ API error.`,
  Failed = `⛔ Translation failed.`,
  Unknown = `⛔ Unknown error.`,
}

/** https://platform.openai.com/docs/guides/error-codes */
// const ApiErrors = {
//   401: [
//     { message: "Invalid Authentication",	cause: "Invalid Authentication", solution: "Ensure the correct API key and requesting organization are being used." },
//     { message: "Incorrect API key provided",	cause: "The requesting API key is not correct.", solution: "Ensure the API key used is correct, clear your browser cache, or generate a new one."},
//     { message: "You must be a member of an organization to use the API",	cause: "Your account is not part of an organization.", solution: "Contact us to get added to a new organization or ask your organization manager to invite you to an organization."},
//   ],
//   429: [
//     { message: "Rate limit reached for requests",	cause: "You are sending requests too quickly.", solution: "Pace your requests. Read the Rate limit guide." },
//     { message: "You exceeded your current quota, please check your plan and billing details",	cause: "You have hit your maximum monthly spend (hard limit) which you can view in the account billing section.", solution: "Apply for a quota increase." },
//   ],
//   500: [
//     { message: "The server had an error while processing your request",	cause: "Issue on our servers.", solution: "Retry your request after a brief wait and contact us if the issue persists. Check the status page." },
//   ],
//   503: [
//     { message: "The engine is currently overloaded, please try again later",	cause: "Our servers are experiencing high traffic.", solution: "Please retry your requests after a brief wait." },
//   ],
// }

const MODEL_GPT_3_5_TURBO = `gpt-3.5-turbo`
// const MODEL_GPT_3_5_TURBO_16K = `gpt-3.5-turbo-16k`
// const MODEL_GPT_4 = `gpt-4`
// const MODEL_GPT_4_32K = `gpt-4-32k`

interface TranslateResult {
  translated: string
  contentChunks: Content
  translatedChunks: Content
}
interface TranslateFileResult {
  content: string
  translated: string
}

/** Select document processing strategy. */
export const selectStrategy = (file: string): DocumentStrategy => {
  if (file.endsWith(Markdown.extension)) return Markdown

  throw new Error(Errors.Unsupported, { cause: file })
}

/** Create ChatGPT client with small configuration changes. */
export const createGptClient = (apiKey: string): OpenAI => {
  // apiKey <~ OPENAI_API_KEY
  // organization <~ OPENAI_ORG_ID

  return new OpenAI({
    apiKey,
    // baseURL: `https://api.openai.com/v1`,
    // timeout, maxRetries,
  })
}

/** Calculate the quickest hash for chunk */
export const xxhHash = async (text: string): Promise<string> => {
  const { h32ToString } = await xxhash()

  return h32ToString(text)
}

const EMPTY_COMPLETION: Partial<OpenAI.ChatCompletion> = {
  usage: { total_tokens: 0, completion_tokens: 0, prompt_tokens: 0 },
  choices: [],
}

/** Ask openai to do the magic */
export const askGPT = async (text: string, prompt: string, context: JobContext): Promise<string> => {
  const uniqueHash = `${context.job.id}/${await xxhHash(text)}`

  const { increment, value, duration } = context.stats
  increment(Kpi.calls, 1)
  value(Kpi.operations, 1)
  duration(Kpi.responseAt, uniqueHash)

  const query: OpenAI.ChatCompletionCreateParamsNonStreaming = {
    model: MODEL_GPT_3_5_TURBO,
    messages: [
      { role: `system`, content: prompt },
      { role: `user`, content: text },
    ],
    top_p: 0.5,
  }
  const options = {}

  let data = EMPTY_COMPLETION
  try {
    const openai = createGptClient(context.flags.token)
    const completion = await openai.chat.completions.create(query, options)
    value(Kpi.codes, Http.OK)

    data = { ...EMPTY_COMPLETION, ...completion }
    const content = (data.choices ?? [])[0]?.message?.content ?? ``
    if (content === ``) throw new Error(Errors.EmptyContent)

    return content
  } catch (error: any) {
    value(Kpi.codes, error?.status ?? Http.NOT_IMPLEMENTED)

    // raise errors on non-2xx responses or empty content
    if (error instanceof OpenAI.APIError) {
      throw new Error(Errors.ApiError, { cause: error })
    }

    // Non-OpenAI errors
    throw error
  } finally {
    const totalTokens = data?.usage?.total_tokens ?? 0

    // extract statistics from response
    duration(Kpi.responseAt, uniqueHash)
    increment(Kpi.tokens, totalTokens)
    increment(Kpi.usedTokens, totalTokens)
  }
}

/** Append error information to log file and return the same error for chained calls. */
export const logError = async <T extends Error>(error: T, context: JobContext): Promise<T> => {
  context.stats.increment(Kpi.errors, 1)
  const errorLog = `Error:\n----\n${inspect(error, { depth: 1, breakLength: 120 })}\n----\n`
  if (context.job.log !== undefined) await appendFile(errorLog, context.job.log)

  // TODO (olku): add into error log file hint how to execute tool with
  //  failed file only, without other files
  // error.log = context.job.log

  return error
}

/** Compose log file for each ChatGpt call, used unique UUID. */
export const askGPTWithLogger = async (text: string, prompt: string, context: JobContext): Promise<string> => {
  const { session } = context.flags
  context.job.log = path.resolve(Dirs.local, session, `${context.job.id}.log`)
  const logs = `${MODEL_GPT_3_5_TURBO}:\n----\n${prompt}\n----\n${text}\n----\n`

  await createFile(logs, context.job.log)

  try {
    const content = await askGPT(text, prompt, context)
    const replyLog = `Answer:\n----\n${content}\n----\n`
    await appendFile(replyLog, context.job.log)

    return content
  } catch (error: any) {
    throw await logError(error, context)
  }

  // TODO (olku): generated log file should be displayed to user
}

/** Report translation failure. */
export const reportErrors = async (errors: ChunkError[], context: JobContext): Promise<void> => {
  if (errors.length === 0) return

  const { source, destination } = context.job
  onFail(`Translation failed for ${source} -> ${destination}, log: ${context.job.log}`)

  throw Object.assign(new Error(Errors.Failed, { cause: Exits.errors.code }), { errors })
}

/** Translate provided content. */
export const translate = async (content: string, context: JobContext): Promise<TranslateResult> => {
  const { composePrompt, composeChunks, mergeResults } = selectStrategy(context.job.source)

  const prompt = composePrompt(context)
  const contentChunks = composeChunks({ content, context })

  // parallel processing of chunks
  const pool = await withUI(context, PromisePool.for(contentChunks.chunks))
    .withConcurrency(MAX_CONCURRENCY_CHUNKS)
    .useCorrespondingResults()
    .process(async (chunk) => await askGPTWithLogger(chunk, prompt, context))

  const { results, errors } = pool
  context.stats.increment(Kpi.files, 1)
  await reportErrors(errors, context)

  // if one of the sections failed, replace it with the original text
  const translated = mergeResults({ results, context })

  return {
    translated,
    contentChunks,
    translatedChunks: { chunks: results as string[], tokens: -1, length: translated.length },
  }
}

/** Translate one file. */
export const translateFile = async (context: JobContext): Promise<TranslateFileResult> => {
  const { source, destination } = context.job
  const content = await fs.readFile(source, `utf-8`)
  context.stats.increment(Kpi.read, content.length)
  const { translated } = await translate(content, context)

  // Check if the translation is same as the original
  if (await isFileExists(destination)) {
    const fileContent = await fs.readFile(destination, `utf-8`)

    if (fileContent === translated) {
      throw await logError(new Error(Errors.SameContent), context)
    }
  }

  // write translated content to destination file
  await createFile(translated, destination)
  context.stats.increment(Kpi.write, translated.length)

  return { content, translated }
}
