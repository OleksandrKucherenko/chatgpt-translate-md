import fs from 'fs/promises'
import path from 'path'

export const isENOENT = (err: NodeJS.ErrnoException) => err.code === 'ENOENT'

/** Create files recursively if no directory. */
export const createFile = async (data: string, filePath: string): Promise<void> => {
  try {
    await fs.writeFile(filePath, data)
  } catch (err) {
    if (!isENOENT(err as NodeJS.ErrnoException)) throw err

    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await createFile(data, filePath)
  }
}

/** Append content to file. */
export const appendFile = async (data: string, filePath: string): Promise<void> => {
  try {
    await fs.appendFile(filePath, data)
  } catch (err) {
    if (!isENOENT(err as NodeJS.ErrnoException)) throw err

    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await appendFile(data, filePath)
  }
}

/** Check if file exists. */
export const isFileExists = async (inputPath: string) => {
  try {
    await fs.stat(inputPath)
    return true
  } catch (error) {
    if (isENOENT(error as NodeJS.ErrnoException)) return false

    throw error
  }
}

// const delay = (ms: number) => new Promise((_) => setTimeout(_, ms))
