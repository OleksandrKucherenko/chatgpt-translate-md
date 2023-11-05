/* eslint-disable import/first */
import { jest, describe, expect, it, beforeAll, afterAll, afterEach } from '@jest/globals'
import 'isomorphic-fetch'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

jest.mock(`openai/dist/base`)
jest.mock(`./ui`, () => ({}))

import { askGPT } from './gpt'
import type { JobContext } from './types'
import { metrics } from '@this/telemetry'
import { Routes } from '@this/arguments'

const server = setupServer(
  http.post(`https://api.openai.com/v1/chat/completions`, () => {
    return HttpResponse.json({ message: `Rate limit reached for requests` }, { status: 429 })
  })
)

describe(`gpt`, () => {
  const fakeSession = `fake-unit-tests-session`

  beforeAll(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  it(`should raise custom error on API error 429`, async () => {
    // GIVEN: all dummy values, we are test axios/sdk configuration
    const text = `dummy text`
    const prompt = `dummy prompt`
    const context: JobContext = {
      flags: {
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
        command: Routes.translate,
        debug: false,
      },
      job: { id: `fake-job-id`, source: ``, destination: ``, language: `` },
      stats: metrics(fakeSession),
    }

    // WHEN:
    await expect(async () => await askGPT(text, prompt, context)).rejects.toThrowError(`⛔ API error.`)

    // THEN:
  })
})
