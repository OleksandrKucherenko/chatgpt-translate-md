import * as path from 'node:path'
import * as fs from 'node:fs'
import { fileURLToPath } from 'url'

const FILE_NAME = fileURLToPath(import.meta.url)
// const FILE_NAME = __filename

const DIR_NAME = path.dirname(FILE_NAME)

export const PATH_ROOT = path.resolve(DIR_NAME, `..`, `..`)
export const PATH_LOCAL = path.resolve(PATH_ROOT, `output`)
export const PATH_ASSETS = path.resolve(PATH_ROOT, `clis`, `gpt`, `assets`)

export const Dirs = Object.freeze({
  root: PATH_ROOT,
  local: PATH_LOCAL,
  assets: PATH_ASSETS,
})

/** create local output directories if they don't exist */
fs.mkdirSync(Dirs.local, { recursive: true })
