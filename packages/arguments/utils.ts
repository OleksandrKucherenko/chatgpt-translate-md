import { glob } from 'glob'
import fs from 'node:fs'

/** force prompts to render 10 lines */
export const AUTOSUGGEST_CHOICES = [
  { title: `Current working directory`, value: process.cwd() },
  { title: `Parent directory`, value: `../` },
  { title: `Grand directory`, value: `../../` },
  { title: `Home directory`, value: `~` },
  { title: `Root directory`, value: `/` },
  { title: `reserved-1`, value: `./` },
  { title: `reserved-2`, value: `./` },
  { title: `reserved-3`, value: `./` },
  { title: `reserved-4`, value: `./` },
  { title: `reserved-5`, value: `./` },
]

export const autoSuggestDirectories = async (input: string, _choices: unknown[]) => {
  const cwd = process.cwd()
  const start = (input.length === 0 ? cwd : input).replace('~', process.env.HOME ?? '~')
  const files = await glob(`${start}*`, { cwd, maxDepth: 1 })
  const value = files?.[0] ?? start

  const suggestions = files ?? [value]

  return suggestions
    .filter((f) => f !== '.' && f !== '..')
    .filter((f) => {
      // security permission error is possible for some directories
      try {
        return fs.lstatSync(f).isDirectory()
      } catch (error) {
        return false
      }
    })
    .map((f) => ({ title: f }))
    .slice(0, 10)
}
