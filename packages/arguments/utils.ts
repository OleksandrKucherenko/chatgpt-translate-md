import { glob } from 'glob'
import fs from 'node:fs'
import { type Choice } from 'prompts'

export const FROM_ARGS = `provided via arguments`

/** force prompts to render 10 lines */
export const AUTOSUGGESTION_CHOICES = [
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

const cwd = process.cwd()

const isDirectory = (file: string): boolean => {
  // security permission error is possible for some directories
  try {
    return fs.lstatSync(file).isDirectory()
  } catch (error) {
    return false
  }
}

const isAllEmpty = <T>(arr1?: T[], arr2?: T[]): boolean => {
  return (arr1 ?? []).length === 0 && (arr2 ?? []).length === 0
}

export const autoSuggestDirectories = async (
  input: string,
  choices: Choice[]
): Promise<Array<{ title: string; value: string }>> => {
  const provided = choices.find(({ title }) => title === FROM_ARGS)?.value ?? cwd
  const start = (input.length === 0 ? provided : input).replace(`~`, process.env.HOME ?? `~`)
  const files = await glob(`${start}*`, { cwd, maxDepth: 1 })
  const hiddenFiles = await glob(`${start}.??*`, { cwd, maxDepth: 1 })
  const value = files?.[0] ?? start

  // provide only the unique list of suggestions, sorted alphabetically
  const merged = [...files, ...hiddenFiles, isAllEmpty(files, hiddenFiles) ? value : null].filter(Boolean) as string[]
  const suggestions = [...new Set(merged)].sort((a, b) => a.localeCompare(b))

  return suggestions
    .filter((f) => f !== `.` && f !== `..`)
    .filter((f) => isDirectory(f))
    .map((f) => ({ title: f, value: f }))
    .slice(0, 10)
}
