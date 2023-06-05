import { type Context } from 'arguments'
import { type PromisePoolError } from '@supercharge/promise-pool'

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

export type Metrics = {
  readonly totalFiles: number
  readonly usedTokens: number
}

export type JobContext = Context & {
  readonly job: Job
  readonly stats?: Metrics
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
