import * as gpt from 'openai'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PromisePool } from '@supercharge/promise-pool'
import axios from 'axios'
import createError from 'axios/lib/core/createError'

import { Dirs, Exits } from '@this/configuration'

import { appendFile, createFile, isFileExists } from './utils'
import { ChunkError, Content, Kpi, type DocumentStrategy, type JobContext } from './types'
import { Markdown } from './markdown'
import { onScreen, withUI } from './ui'

/** How many chunks process at the same time. */
export const MAX_CONCURRENCY_CHUNKS = 5

/** Exception messages (for i18n). */
enum Errors {
  SameContent = '⛔ The result of translation was same as the existed output file.',
  EmptyContent = '⛔ The result of translation was empty.',
  Unsupported = `⛔ Unsupported file type.`,
  ApiError = `⛔ API error.`,
  Failed = `⛔ Translation failed.`,
}

/** https://platform.openai.com/docs/guides/error-codes */
// const ApiErrors = {
//   401: [
//     { message: "Invalid Authentication",	cause: "Invalid Authentication", soltuion: "Ensure the correct API key and requesting organization are being used." },
//     { message: "Incorrect API key provided",	cause: "The requesting API key is not correct.", solution: "Ensure the API key used is correct, clear your browser cache, or generate a new one."},
//     { message: "You must be a member of an organization to use the API",	cause: "Your account is not part of an organization.", solution: "Contact us to get added to a new organization or ask your organization manager to invite you to an organization."},
//   ],
//   429: [
//     { message: "Rate limit reached for requests",	cause: "You are sending requests too quickly.", soltuion: "Pace your requests. Read the Rate limit guide." },
//     { message: "You exceeded your current quota, please check your plan and billing details",	cause: "You have hit your maximum monthly spend (hard limit) which you can view in the account billing section.", soltuion: "Apply for a quota increase." },
//     { message: "The engine is currently overloaded, please try again later",	cause: "Our servers are experiencing high traffic.", soltuion: "Please retry your requests after a brief wait." },
//   ],
//   500: [
//     { message: "The server had an error while processing your request",	cause: "Issue on our servers.", soltuion: "Retry your request after a brief wait and contact us if the issue persists. Check the status page." },
//   ],
// }

const MODEL = 'gpt-3.5-turbo'
const MSG_SYSTEM_PROMPT = { role: gpt.ChatCompletionRequestMessageRoleEnum.System }
const MSG_USER_CONTENT = { role: gpt.ChatCompletionRequestMessageRoleEnum.User }

type TranslateResult = { translated: string; contentChunks: Content; translatedChunks: Content }
type TranslateFileResult = { content: string; translated: string }

/** Select document processing strategy. */
export const selectStrategy = (file: string): DocumentStrategy => {
  if (file.endsWith(Markdown.extension)) return Markdown

  throw new Error(Errors.Unsupported, { cause: file })
}

/** Create ChatGPT client with small configuration changes. */
export const createGptClient = (apiKey: string) => {
  const configuration = new gpt.Configuration({ apiKey })

  // do not raise exception on non-2xx responses
  axios.defaults.validateStatus = () => true

  return new gpt.OpenAIApi(configuration)
}

/** stolen from: axios/lib/core/settle.js:17:12 */
const createAxiosError = (response: any) => createError(
  'Request failed with status code ' + response.status,
  response.config,
  null,
  response.request,
  response
)

/** Ask openai to do the magic */
export const askGPT = async (text: string, prompt: string, context: JobContext): Promise<string> => {
  context.stats.increment(Kpi.calls, 1)
  context.stats.value(Kpi.operations, 1)
  context.stats.duration(Kpi.responseAt, `${context.job.id}`)
  const openAIApi = createGptClient(context.flags.token)

  const query = {
    model: MODEL,
    messages: [
      { ...MSG_SYSTEM_PROMPT, content: prompt },
      { ...MSG_USER_CONTENT, content: text },
    ],
    top_p: 0.5,
  }

  const response = await openAIApi.createChatCompletion(query)
  context.stats.value(Kpi.codes, response.status)

  const {
    usage: { total_tokens = 0 } = { total_tokens: 0 },
    choices: [{ message: { content } = { content: '' } }],
  } = response.data

  // extract statistics from response
  context.stats.duration(Kpi.responseAt, `${context.job.id}`)
  context.stats.increment(Kpi.tokens, total_tokens)
  context.stats.increment(Kpi.usedTokens, total_tokens)

  // raise errors on non-2xx responses or empty content
  if(!(response.status >= 200 && response.status < 300)) throw new Error(Errors.ApiError, { cause: createAxiosError(response) } )
  if (content === '') throw new Error(Errors.EmptyContent)

  return content
}

/** Compose log file for each ChatGpt call, used unique UUID. */
export const askGPTWithLogger = async (text: string, prompt: string, context: JobContext): Promise<string> => {
  const { session } = context.flags
  context.job.log = path.resolve(Dirs.local, session, `${context.job.id}.log`)
  const logs = `${MODEL}:\n----\n${prompt}\n----\n${text}\n----\n`

  await createFile(logs, context.job.log)

  try {
    const content = await askGPT(text, prompt, context)
    await appendFile(`Answer:\n\n${content}\n----\n`, context.job.log)

    return content
  } catch (error: any) {
    context.stats.increment(Kpi.errors, 1)
    const errorLog = `Error:\n\n${JSON.stringify(error, null, 2)}\n----\n`
    await appendFile(errorLog, context.job.log)

    // TODO (olku): add into error log file hint how to execute tool with
    //  failed file only, without other files

    error.log = context.job.log
    throw error
  }

  // TODO (olku): generated log file should be displayed to user
}

/** Report translation failure. */
export const reportErrors = async (errors: ChunkError[], context: JobContext) => {
  if (errors.length === 0) return

  const { source, destination } = context.job
  onScreen(`⛔ Translation failed for ${source} -> ${destination}, log: ${context.job.log}`)

  throw new Error(Errors.Failed, { cause: Exits.errors.code })
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
    .process(async (chunk) => {
      return askGPTWithLogger(chunk, prompt, context)
    })

  const { results, errors } = pool
  context.stats.decrement(Kpi.files, 1)
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
  const content = await fs.readFile(source, 'utf-8')
  context.stats.increment(Kpi.read, content.length)
  const { translated } = await translate(content, context)

  // Check if the translation is same as the original
  if (await isFileExists(destination)) {
    const fileContent = await fs.readFile(destination, 'utf-8')

    if (fileContent === translated) throw new Error(Errors.SameContent)
  }

  await createFile(translated, destination)
  context.stats.increment(Kpi.write, translated.length)

  return { content, translated }
}
