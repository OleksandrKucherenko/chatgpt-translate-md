import { type RichContext } from '@this/arguments'
import { type PromisePoolError } from '@supercharge/promise-pool'
import { type Schema } from '@this/telemetry'

export enum Kpi {
  /** reported by API usage of tokens */
  usedTokens = `per:minute:used:tokens`, // increment
  /** number of starte operations */
  operations = `per:minute:operations`, // value
  /** this more like estimated token usage, only after API call we will know the real usage. */
  tokens = `total:used:tokens`, // increment
  files = `total:processed:files`, // set value, with decrement
  /** Also correspond the total amound of chunks. */
  calls = `total:api:calls`, // increment
  /** api response duration */
  responseAt = `histogram:api:response:time`, // duration 'start'|'end'
  /** api failure */
  errors = `total:api:errors`, // increment
  /** api reported coded */
  codes = `histogram:api:errors`, // value (200, 4xx, 5xx)
  /** Bytes read from content files */
  read = `total:content:bytes:read`, // increment
  /** Bytes written to content files */
  write = `total:content:bytes:written`, // increment
}

export const Statistics: Schema<Kpi> = {
  'per:minute:used:tokens': { description: 'Number of Used Tokens per Minute', operation: `histogram` },
  'per:minute:operations': { description: 'Number of Operations per Minute', operation: `histogram` },
  'total:used:tokens': { description: 'Total Number of Used Tokens', operation: `counter` },
  'total:processed:files': { description: 'Number of Processed Files', operation: `counter` },
  'total:api:calls': { description: 'Number of API Calls', operation: `counter` },
  'histogram:api:response:time': { description: 'Distribution of API Response Time', operation: `histogram` },
  'total:api:errors': { description: 'Number of API Errors', operation: `counter` },
  'histogram:api:errors': { description: 'Distribution of API Errors', operation: `histogram` },
  'total:content:bytes:read': { description: 'Number of Content Bytes Read', operation: `counter` },
  'total:content:bytes:written': { description: 'Number of Content Bytes Written', operation: `counter` },
}

export type Content = {
  chunks: string[]
  tokens: number
  length: number
}

export type Job = {
  source: string
  destination: string
  language: string
}

export type JobError = PromisePoolError<Job, any>

export type ChunkError = PromisePoolError<string, any>

export type JobContext = RichContext & {
  readonly job: Job
}

export type JobContent = {
  content: string
  context: JobContext
}

export type JobResults = {
  results: (string | symbol)[]
  context: JobContext
}

export interface DocumentStrategy {
  readonly title: string
  readonly description: string
  readonly extension: string

  composePrompt(context: JobContext): string
  composeChunks(content: JobContent): Content
  mergeResults(done: JobResults): string
}

export interface UiStrategy {
  readonly title: string
  readonly description: string
}
