import { parseArguments } from '@this/arguments'
import { afterEach, describe, expect, test, vi } from 'vitest'

describe(`cli entrypoint`, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test(`prints help successfully`, async () => {
    const output: string[] = []
    vi.spyOn(console, `log`).mockImplementation((line = ``) => {
      output.push(String(line))
    })
    vi.spyOn(process, `exit`).mockImplementation((code?: string | number | null) => {
      throw Object.assign(new Error(`process.exit`), { code }) as never
    })

    await expect(parseArguments([`node`, `cli-gpt`, `--help`])).rejects.toMatchObject({ code: 0 })
    expect(output.join(`\n`)).toContain(`Usage: cli-gpt`)
  })
})
