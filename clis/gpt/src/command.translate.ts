import path from 'node:path'
import { glob } from 'glob'
import { PromisePool } from '@supercharge/promise-pool'
import { dumpD, logD, log } from '@this/configuration'
import { type Context } from '@this/arguments'
import { translateFile } from './gpt'

export const findFilesByGlob = async (cwd: string, search: string, ignore: string): Promise<string[]> => {
  dumpD(`cwd: %s, glob: %s, ignored: %s resolved via: %s`, cwd, search, ignore, process.cwd())

  const files = await glob(search, { cwd, ignore })
  logD(`found files for processing: %o`, files.length)

  return files
}

export const suggestDestination = (source: string, language: string, overwrite: boolean): string => {
  if (overwrite) return source

  // expected: *.md -> *.ukrainian.md
  const ext = path.extname(source)
  const lang = language.toLowerCase()

  return source.replace(new RegExp(`${ext}$`), `.${lang}${ext}`)
}

export const execute = async (context: Context): Promise<void> => {
  const { cwd, source, language, overwrite, ignore } = context.flags
  // extract all md files based on context CWD and search glob
  const files: string[] = await findFilesByGlob(cwd, source, ignore)

  // suggest output file naming strategy, resolve to absolute path's
  const forProcessing = files.map((file: string) => ({
    source: path.resolve(cwd, file),
    destination: path.resolve(cwd, suggestDestination(file, language, overwrite)),
    language,
  }))

  // do processing of files one by one
  const { results, errors } = await PromisePool.for(forProcessing)
    .withConcurrency(5)
    .process(async ({ source, destination, language }) => {
      return translateFile(source, destination, language)
    })

  // wait for all jobs to finish
  dumpD(`results: %o`, results)
  dumpD(`errors: %o`, errors)
  log(`translated files: %o, errors: %o`, results.length, errors.length)
  if (errors.length > 0 && errors.length <= 5) {
    log(
      `errors: %O`,
      errors.map((e) => ({ file: e.item.source, message: e.message }))
    )
  }
}
