import { describe, expect, it, vi } from 'vitest'
import { askGPT } from './gpt.js'
import type { JobContext } from './types.js'
import { metrics } from '@this/telemetry'
import type { Routes } from '@this/arguments'

vi.mock(`./ui.js`, () => ({}))
vi.mock(`openai`, () => {
  class APIError extends Error {
    status: number

    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }

  class OpenAI {
    static APIError = APIError

    chat = {
      completions: {
        create: async (): Promise<never> => {
          throw new APIError(429, `Rate limit reached for requests`)
        },
      },
    }
  }

  return { __esModule: true, default: OpenAI }
})

describe(`gpt`, () => {
  const fakeSession = `fake-unit-tests-session`

  it(`should raise custom error on API error 429`, async () => {
    // GIVEN: all dummy values, we are test axios/sdk configuration
    const text = `dummy text`
    const prompt = `dummy prompt`
    const context: JobContext = {
      flags: {
        organization: ``,
        session: fakeSession,
        cwd: `string`,
        source: `string`,
        ignore: `string`,
        list: false,
        overwrite: false,
        language: `string`,
        sourceList: `string`,
        token: `string`,
        template: `string`,
        ask: false,
        command: `translate` as Routes,
        debug: false,
      },
      job: { id: `fake-job-id`, source: ``, destination: ``, language: `` },
      stats: metrics(fakeSession),
    }

    // WHEN:
    await expect(async () => await askGPT(text, prompt, context)).rejects.toThrow(`⛔ API error.`)

    // THEN:
  })
})
