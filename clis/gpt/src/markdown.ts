import fs from 'node:fs'
import path from 'node:path'
import { encode } from 'gpt-3-encoder'
import { Dirs, dumpD } from '@this/configuration'
import Handlebars from 'handlebars'
import type { DocumentStrategy, Content, JobResults, JobContext } from './types'

export const MARKDOWN_SPLITTER = `\n\n`

/** Max allowed tokens to process in one chunk. */
export const MAX_TOKENS = 2000

interface Options {
  maxToken: number
  splitter: string
}
type Chunked = Record<number, string>

export const DefaultOptions: Options = { maxToken: MAX_TOKENS, splitter: MARKDOWN_SPLITTER }

export const composePrompt = (context: JobContext): string => {
  const { template: fileName } = context.flags
  const variants = [path.resolve(Dirs.root, fileName), path.resolve(Dirs.assets, fileName), path.resolve(fileName)]
  const foundPath = variants.find((p) => fs.existsSync(p))
  if (foundPath === undefined) {
    throw new Error(`Template file not found by pathes: ${variants.join(`, `)}`)
  }

  const content = fs.readFileSync(foundPath, `utf-8`)
  const template = Handlebars.compile(content)

  return template(context).trim()
}

const optimizeChunks = (chunks: string[], options?: Options): string[] => {
  const { maxToken, splitter } = { ...DefaultOptions, ...options }

  let chunkIndex = 0
  let delimiter = ``
  const merged: Chunked = chunks.reduce<Chunked>(
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
    { 0: `` }
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
