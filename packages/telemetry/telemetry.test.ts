// import { describe, expect, test } from '@jest/globals'
// import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { metrics } from './telemetry'
import { type Schema } from './types'

enum Kpi {
  /** reported by API usage of tokens */
  usedTokens = `per:minute:used:tokens`, // increment
  /** number of started operations */
  operations = `per:minute:operations`, // value
  /** this more like estimated token usage, only after API call we will know the real usage. */
  tokens = `total:used:tokens`, // increment
  /** total number of files that is decremented on each processed. */
  files = `total:processed:files`, // set value, with decrement
  /** Also correspond the total amount of chunks. */
  calls = `total:api:calls`, // increment
  /** api response duration */
  responseAt = `histogram:api:response:time`, // duration 'start'|'end'
  /** api failure */
  errors = `total:api:errors`, // increment
  /** api reported coded */
  codes = `histogram:api:errors`, // value (200, 4xx, 5xx)
  /** Bytes read from content files */
  read = `total:content:bytes:read`, // increment
  /** Bytes written to content files */
  write = `total:content:bytes:written`, // increment
}

const CurrentSchema: Schema<Kpi> = {
  'per:minute:used:tokens': { description: `Number of Used Tokens per Minute`, operation: `range` },
  'per:minute:operations': { description: `Number of Operations per Minute`, operation: `range` },
  'total:used:tokens': { description: `Total Number of Used Tokens`, operation: `sum` },
  'total:processed:files': { description: `Number of Processed Files`, operation: `counter` },
  'total:api:calls': { description: `Number of API Calls`, operation: `counter` },
  'histogram:api:response:time': { description: `Distribution of API Response Time`, operation: `duration` },
  'total:api:errors': { description: `Number of API Errors`, operation: `counter` },
  'histogram:api:errors': { description: `Distribution of API Errors`, operation: `frequency` },
  'total:content:bytes:read': { description: `Number of Content Bytes Read`, operation: `sum` },
  'total:content:bytes:written': { description: `Number of Content Bytes Written`, operation: `sum` },
}

describe(`telemetry`, () => {
  const session = `160638f3-3dbc-4a3f-b416-f94c732bc3bb`

  beforeAll(() => {
    // copy test CSV file to session directory
  })

  afterAll(() => {
    // delete session directory test data
  })

  test(`should calculate stats - number of calls`, async () => {
    // GIVEN: session directory with test data
    const statistics = metrics(session)

    // WHEN: calculate statistics, time is in nanoseconds
    const data = await statistics.stats(0n, 2026370565810374n, CurrentSchema)

    // THEN: statistics are calculated correctly
    expect(data.statistics[Kpi.calls]).toBe(33)
  })

  test(`should calculate stats - one failed call`, async () => {
    // GIVEN: session directory with test data
    const statistics = metrics(session)

    // WHEN: calculate statistics, time is in nanoseconds
    const data = await statistics.stats(0n, 2026370565810374n, CurrentSchema)

    // THEN: statistics are calculated correctly
    expect(Object.fromEntries(data.statistics[Kpi.codes])).toHaveProperty(`502`, 1)
    expect(Object.fromEntries(data.statistics[Kpi.codes])).toHaveProperty(`200`, 32)
    // expect(Object.fromEntries(data.statistics[Kpi.codes])).toStrictEqual(
    //   expect.objectContaining({ '200': 32, '502': 1 })
    // )
  })

  test(`should calculate stats - extracted durations`, async () => {
    // GIVEN: session directory with test data
    const statistics = metrics(session)

    // WHEN: calculate statistics, time is in nanoseconds
    const data = await statistics.stats(0n, 2026370565810374n, CurrentSchema)
    console.dir(data.statistics, { depth: 3, breakLength: 120 })

    // THEN: statistics are calculated correctly
    // expect(data.statistics[Kpi.responseAt]).toEqual(
    //   expect.objectContaining({
    //     units: `milliseconds`,
    //     min: 4,
    //     max: 82659,
    //     avg: 15278.353301515152,
    //     timeline: expect.any(Array),
    //     mapping: expect.any(Array),
    //     count: 33,
    //   })
    // )
    expect(data.statistics[Kpi.responseAt]).toHaveProperty(`units`, `milliseconds`)
    expect(data.statistics[Kpi.responseAt]).toHaveProperty(`min`, 4)
    expect(data.statistics[Kpi.responseAt]).toHaveProperty(`max`, 82659)
    expect(data.statistics[Kpi.responseAt]).toHaveProperty(`avg`, 15278.353301515152)
    expect(data.statistics[Kpi.responseAt]).toHaveProperty(`timeline`, expect.any(Array))
    expect(data.statistics[Kpi.responseAt]).toHaveProperty(`mapping`, expect.any(Array))
    expect(data.statistics[Kpi.responseAt]).toHaveProperty(`count`, 33)
  })
})
