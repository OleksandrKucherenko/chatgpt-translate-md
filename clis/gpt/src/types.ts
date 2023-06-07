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
  'per:minute:used:tokens': { description: `Number of Used Tokens per Minute`, operation: `range` },
  'per:minute:operations': { description: `Number of Operations per Minute`, operation: `range` },
  'total:used:tokens': { description: `Total Number of Used Tokens`, operation: `sum` },
  'total:processed:files': { description: `Number of Processed Files`, operation: `counter` },
  'total:api:calls': { description: `Number of API Calls`, operation: `counter` },
  'histogram:api:response:time': { description: `Distribution of API Response Time`, operation: `histogram` },
  'total:api:errors': { description: `Number of API Errors`, operation: `counter` },
  'histogram:api:errors': { description: `Distribution of API Errors`, operation: `frequiency` },
  'total:content:bytes:read': { description: `Number of Content Bytes Read`, operation: `sum` },
  'total:content:bytes:written': { description: `Number of Content Bytes Written`, operation: `sum` },
}

export interface Content {
  chunks: string[]
  tokens: number
  length: number
}

export interface Job {
  source: string
  destination: string
  language: string
  /** unique UUID of the job. */
  id: string
  /** Job log file path */
  log?: string
}

export type JobError = PromisePoolError<Job, any>

export type ChunkError = PromisePoolError<string, any>

export type JobContext = RichContext & {
  readonly job: Job
}

export interface JobContent {
  content: string
  context: JobContext
}

export interface JobResults {
  results: Array<string | symbol>
  context: JobContext
}

export interface DocumentStrategy {
  readonly title: string
  readonly description: string
  readonly extension: string

  composePrompt: (context: JobContext) => string
  composeChunks: (content: JobContent) => Content
  mergeResults: (done: JobResults) => string
}

export interface UiStrategy {
  readonly title: string
  readonly description: string
}
