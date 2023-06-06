/* eslint-disable @typescript-eslint/restrict-plus-operands */

import * as sl from 'stats-lite'
import { type TimeRecord, type TRecord, type Operations, type Series, type Schema, type Finals } from './types'
import { logD } from '@this/configuration'

export const polarity = (item: TimeRecord): object | number | string =>
  item.action === `decrement` ? -Number(item.value) : item.value

type StatFunc = (numbers: number[], items: TRecord[]) => any
type CompareFn = (a: number, b: number) => number
const ClassisNums: CompareFn = (a, b) => a - b

export const binarySearch = (arr: number[], el: number, compareFn: CompareFn = ClassisNums): number => {
  let m = 0
  let n = arr.length - 1
  while (m <= n) {
    const k = (n + m) >> 1
    const cmp = compareFn(el, arr[k])
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

export const statisticsFn = (operation: Operations): StatFunc => {
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
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          const sum = (acc.get(aligned[rangeIndex]) || 0) + Number(item.value)
          return acc.set(aligned[rangeIndex], sum)
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

export const stats = async (from: bigint, to: bigint, schema: Schema<any>, data: TimeRecord[]): Promise<Finals> => {
  // convert data to series
  const series = data
    .filter((item) => BigInt(item.timestamp) >= from && BigInt(item.timestamp) <= to)
    .reduce<Series>((acc, row) => {
      const { timestamp, name, action, value } = row
      const prev = acc[name] ?? { values: [] }
      return { ...acc, [name]: { ...prev, values: [...prev.values, { timestamp, action, value }] } }
    }, {})

  // calculate statistics
  const statistics = Object.keys(schema).reduce((acc, key) => {
    try {
      const kpi = schema[key]
      const operation = typeof kpi === `string` ? kpi : kpi.operation
      const fn = statisticsFn(operation)
      const numbers = series[key].values.map((item: any) => polarity(item) as number)
      const results = fn(numbers, series[key].values)
      return { [key]: results, ...acc }
    } catch (error) {
      logD(`error: %O`, error)
      return { ...acc, [key]: `error` }
    }
  }, {})

  return { statistics, from, to, schema }
}
