import fs from 'node:fs'
import path from 'node:path'
import utils from 'node:util'
import { glob } from 'glob'
import { PromisePool } from '@supercharge/promise-pool'
import { v4 as uuid } from 'uuid'
import chalk from 'chalk'

import { Dirs, dumpD, Exits, log } from '@this/configuration'
import type { Context, RichContext, TypedArguments } from '@this/arguments'

import { translateFile } from './gpt'
import { createFile } from './utils'
import { type Job, type JobError, Statistics } from './types'
import { spinnies, onSuccess } from './ui'

type FindOptions = Pick<TypedArguments, `cwd` | `ignore` | `list`>
type DestinationOptions = Pick<TypedArguments, `overwrite` | `language` | `cwd` | `session`>

/** How many files process at the same time. */
export const MAX_CONCURRENCY_FILES = 5

/** Resolve the search pattern to a list of files. */
export const findFilesByGlob = async (search: string, { cwd, ignore, list }: FindOptions): Promise<string[]> => {
  dumpD(`cwd: %s, search: %s, ignore: %s, is list: %s`, cwd, search, ignore, list)

  const files: string[] = []

  if (list === true) {
    if (!fs.existsSync(search)) throw new Error(`File ${search} does not exist`)
    const content = await fs.promises.readFile(search, `utf-8`)
    const searches = content.split(`\n`)
    const linesOptions = { cwd, ignore, list: false }

    for (const line of searches) {
      if (line.startsWith(`#`)) continue // skip comments
      if (line.trim().length === 0) continue // skip empty lines

      files.push(...(await findFilesByGlob(line, linesOptions)))
    }
  } else {
    files.push(...(await glob(search, { cwd, ignore })))
  }

  dumpD(`found files for processing: %o`, files.length)

  // sort and filter out empty values, left only unique value
  return [...new Set(files.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

/** Suggest destination file name based on source file name, language and overwrite flag. */
export const suggestDestination = (source: string, language: string, overwrite: boolean): string => {
  if (overwrite) return source

  // expected: *.md -> *.ukrainian.md
  const ext = path.extname(source)
  const lang = language.toLowerCase()

  return source.replace(new RegExp(`${ext}$`), `.${lang}${ext}`)
}

/** Resolve source and destination paths to absolute for each file. */
export const composeJobs = (files: string[], { cwd, language, overwrite }: DestinationOptions): Job[] => {
  return files.map((file: string) => ({
    id: uuid(),
    source: path.resolve(cwd, file),
    destination: path.resolve(cwd, suggestDestination(file, language, overwrite)),
    language,
  }))
}

/** Report all captured errors into session error.log file and force error exit. */
export const reportErrors = async (errors: JobError[], context: Context): Promise<void> => {
  if (errors.length === 0) return

  const { session } = context.flags
  const reportFile = path.resolve(Dirs.local, session, `errors.log`)

  // extract source files names and dump to file
  const content = errors.map((e) => e.item.source).join(`\n`)
  await createFile(content, reportFile)

  // dump errors to console
  errors
    .map((e) => ({ file: e.item.source, message: e.message, log: e.item.log }))
    .forEach((record) => {
      log(`errors: %O`, record)
    })

  throw new Error(`Translated has some errors. Check file ${reportFile} for details.`, {
    cause: Exits.errors.code,
  })
}

/** Report all collected statistic */
export const reportStats = async (from: bigint, context: RichContext): Promise<void> => {
  spinnies.stopAll()

  const finals = await context.stats.stats(from, process.hrtime.bigint(), Statistics)
  log(`statistics: %O`, finals)

  Object.keys(finals.statistics).forEach((key) => {
    const dump = utils.inspect(finals.statistics[key], { depth: 3 })
    onSuccess(`${chalk.white(key)}: ${dump}`)
  })
}

/** Translate all files based on the provided context. */
export const execute = async (context: RichContext): Promise<void> => {
  const { source } = context.flags
  const from = process.hrtime.bigint()

  // extract all files based on context CWD and search glob
  const files: string[] = await findFilesByGlob(source, context.flags)

  // suggest output file naming strategy, resolve to absolute path's
  const forProcessing = composeJobs(files, context.flags)

  // show some hints to user
  onSuccess(`stats of the pipe: active|processed|total|progress, example: 5|10|100|10.0%`)

  // do processing of files one by one
  const pool = await PromisePool.for(forProcessing)
    .withConcurrency(MAX_CONCURRENCY_FILES)
    .process(async (job) => await translateFile({ ...context, job }))

  // wait for all jobs to finish
  const { results, errors } = pool
  log(`translated files: %o, errors: %o`, results.length, errors.length)

  // report statistics
  await reportStats(from, context)

  // it can throw the exception, keep it the last command in the chain
  await reportErrors(errors, context)
}
