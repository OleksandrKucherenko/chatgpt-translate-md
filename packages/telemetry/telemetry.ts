import path from 'node:path'
import fs from 'node:fs'
import { appendFile } from 'node:fs/promises'
import Papa from 'papaparse'
import * as sl from 'stats-lite'

import { Dirs, logD } from '@this/configuration'

export interface Finals {
  statistics: any
  from: bigint
  to: bigint
  schema: any
}

export interface Metrics {
  impression: (name: string, payload: any) => void
  action: (name: string, payload: any) => void
  increment: (name: string, value: number) => void
  decrement: (name: string, value: number) => void
  value: (name: string, value: number) => void
  duration: (name: string, value: number | string) => void
  stats: <T extends keyof any>(from: bigint, to: bigint, schema: Schema<T>) => Promise<Finals>
}

export type Actions = `increment` | `decrement` | `value` | `impression` | `action` | `duration`
export type Operations = `sum` | `avg` | `min` | `max` | `counter` | `histogram` | `percentile` | `frequiency` | `range`
export interface KPI {
  description: string
  operation: Operations
}

export interface TRecord {
  timestamp: bigint
  value: object | number | string
  action: Actions
}
export interface TimeRecord extends TRecord {
  name: string
}

type Series = Record<string, { values: TRecord[] }>

export type Schema<T extends keyof any> = Record<T, Operations | KPI>

export interface Telemetry extends Metrics {
  // TODO (olu): reserved for future use
}

export const metrics = (session: string): Telemetry => {
  // compose output directory for session
  fs.mkdirSync(path.resolve(Dirs.local, session), { recursive: true })

  // create telemetry CSV file if it not exists yet
  const telemetryFile = path.resolve(Dirs.local, session, `telemetry.csv`)
  fs.existsSync(telemetryFile) || fs.writeFileSync(telemetryFile, `timestamp,name,action,value\n`)

  const polarity = (item: TimeRecord) => (item.action === `decrement` ? -Number(item.value) : item.value)

  type StatFunc = (numbers: number[], items: TRecord[]) => any
  const binarySearch = (arr: number[], el: number, compare_fn: (a: number, b: number) => number = (a, b) => a - b) => {
    let m = 0
    let n = arr.length - 1
    while (m <= n) {
      let k = (n + m) >> 1
      let cmp = compare_fn(el, arr[k])
      if (cmp > 0) {
        m = k + 1
      } else if (cmp < 0) {
        n = k - 1
      } else {
        return k
      }
    }
    return ~m
  }

  const statisticsFn = (operation: Operations): StatFunc => {
    switch (operation) {
      case `sum`:
        return sl.sum
      case `avg`:
        return sl.mean
      case `min`:
        return (numbers: number[]) => Math.min(...numbers)
      case `max`:
        return (numbers: number[]) => Math.max(...numbers)
      case `counter`:
        return (numbers: number[]) => numbers.length
      case `histogram`:
        return (numbers: number[]) => sl.histogram(numbers, 10)
      case `percentile`:
        return (numbers: number[]) => sl.percentile(numbers, 0.95)
      case `frequiency`:
        return (numbers: number[]) => numbers.reduce((acc, e) => acc.set(e, (acc.get(e) || 0) + 1), new Map())
      case `range`:
        return (_numbers: number[], _items: TRecord[]) => {
          // find min and max timestamps in items
          const timestamps = _items.map((item: any) => item.timestamp)
          // convert timestamps to nanoseconds to milliseconds and find min and max
          const minMs: number = Math.round(Math.min(...timestamps) / 1_000_000)
          const maxMs: number = Math.round(Math.max(...timestamps) / 1_000_000)

          // calculate optimal range duration in milliseconds,
          // it should be not more than 10 ranges. minimal range is 1min, maximal is 1h
          // gradation should be 10sec, 30sec, 1min, 5min, 10min, 15min, 30min, 1h
          const proposedRangesMs = [
            10_000,
            30_000,
            60_000,
            5 * 60_000,
            10 * 60_000,
            15 * 60_000,
            30 * 60_000,
            60 * 60_000,
          ]
          const rangeMs = Math.max(60_000, Math.min(3_600_000, Math.ceil((maxMs - minMs) / 10 / 60_000) * 60_000))
          const rangeIndex = Math.abs(binarySearch(proposedRangesMs, rangeMs))
          const range = proposedRangesMs[rangeIndex]

          // compose array of new ranges started from minMs and ended with maxMs
          const ranges: number[] = []
          const aligned: string[] = []
          for (let i = minMs, j = 0; i <= maxMs + range; i += range, j += range) {
            ranges.push(Math.round(i) * 1_000_000)
            aligned.push(`[${j}..${j + range})`)
          }

          // calculate number of items in each range
          const init = aligned.reduce((acc, range) => acc.set(range, 0), new Map())
          const map = _items.reduce((acc: any, item: TRecord) => {
            const rangeIndex = Math.abs(binarySearch(ranges, Number(item.timestamp))) - 1
            return acc.set(aligned[rangeIndex], (acc.get(aligned[rangeIndex]) || 0) + Number(item.value))
          }, init)

          return {
            units: `milliseconds`,
            map,
            duration: `${(maxMs - minMs) / 1000}sec`,
            avg: sl.mean([...map.values()]),
           }
        }
      default:
        throw new Error(`Invalid operation: ${operation}`)
    }
  }

  return {
    /** increment metric, report increment */
    increment(name: string, value: number): void {
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},increment,${value}\n`).finally(() => {})
    },

    /** decrement metric, report decrement */
    decrement(name: string, value: number): void {
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},decrement,${value}\n`).finally(() => {})
    },

    /** report metric value at specific time. */
    value(name: string, value: number): void {
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},value,${value}\n`).finally(() => {})
    },

    /** report impression event at specific time. */
    impression(name: string, payload: any): void {
      const json = Papa.unparse([JSON.stringify(payload)])
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},impression,${json}\n`).finally(() => {})
    },

    /** report action event at specific time. */
    action(name: string, payload: any): void {
      const json = Papa.unparse([JSON.stringify(payload)])
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},action,${json}\n`).finally(() => {})
    },

    /** At least two calls of this function required. Durarion is a distance in time between those two calls. */
    duration(name: string, value: number | string): void {
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},duration,${value}\n`).finally(() => {})
    },

    /** calculate statistics in specified time range by rules of provided schema. */
    async stats(from: bigint, to: bigint, schema: Schema<any>): Promise<Finals> {
      // read telemetry file
      const data: TimeRecord[] = await new Promise((resolve, _reject) => {
        const readableStream = fs.createReadStream(telemetryFile)
        Papa.parse<TimeRecord>(readableStream, {
          header: true,
          complete: (results, _file) => resolve(results.data),
        })
      })

      // convert data to series
      const series = data
        .filter((item) => BigInt(item.timestamp) >= from && BigInt(item.timestamp) <= to)
        .reduce((acc, row) => {
          const { timestamp, name, action, value } = row
          const prev = acc[name] ?? { values: [] }
          return { ...acc, [name]: { ...prev, values: [...prev.values, { timestamp, action, value }] } }
        }, {} as Series)

      // calculate statistics
      const statistics = Object.keys(schema).reduce((acc, key) => {
        try {
          const kpi = schema[key]
          const operation = typeof kpi === 'string' ? kpi : kpi.operation
          const fn = statisticsFn(operation)
          const numbers = series[key].values.map((item: any) => polarity(item) as number)
          const results = fn(numbers, series[key].values)
          return { [key]: results, ...acc }
        } catch (error) {
          logD(`error: %O`, error)
          return { ...acc, [key]: 'error' }
        }
      }, {})

      return { statistics, from, to, schema }
    },
  }
}
