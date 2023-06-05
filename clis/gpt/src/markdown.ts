import { encode } from 'gpt-3-encoder'
import { dumpD } from '@this/configuration'
import { DocumentStrategy, Content, JobResults, JobContext } from './types'

export const MARKDOWN_SPLITTER = `\n\n`

/** Max allowed tokens to process in one chunk. */
export const MAX_TOKENS = 2000

type Options = { maxToken: number; splitter: string }
type Chunked = { [key: number]: string }

export const DefaultOptions: Options = { maxToken: MAX_TOKENS, splitter: MARKDOWN_SPLITTER }

export const composePrompt = ({ job: { language } }: JobContext): string => {
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

const optimizeChunks = (chunks: string[], options?: Options) => {
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

export const composeChunks = (content: string, options?: Options): Content => {
  const { splitter } = { ...DefaultOptions, ...options }
  const draftChunks = content.split(splitter)
  dumpD(`Potential chunks: %o content length: %o`, draftChunks.length, content.length)

  // optimize chunks by merging parts
  const chunks = optimizeChunks(draftChunks, options)

  // count total number of used tokens
  const totalTokens = chunks.reduce((total, chunk) => total + encode(chunk).length, 0)
  dumpD(`Potential chunks: %o ~> %o, used tokens: %o`, draftChunks.length, chunks.length, totalTokens)

  return { chunks, tokens: totalTokens, length: content.length }
}

export const mergeResults = (doneJob: JobResults, options?: Options): string => {
  const { splitter } = { ...DefaultOptions, ...options }
  const { results } = doneJob

  return results.filter((f) => typeof f === `string`).join(splitter)
}

export const Markdown: DocumentStrategy = {
  title: `Markdown`,
  description: `Translate Markdown files`,
  extension: `.md`,

  composePrompt: (context) => {
    return composePrompt(context)
  },
  composeChunks: ({ content }) => {
    return composeChunks(content, DefaultOptions)
  },
  mergeResults: (done) => {
    return mergeResults(done, DefaultOptions)
  },
}
