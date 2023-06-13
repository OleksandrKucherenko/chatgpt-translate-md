/* eslint-disable @typescript-eslint/restrict-plus-operands */

import * as sl from 'stats-lite'
import { type TimeRecord, type TRecord, type Operations, type Series, type Schema, type Finals } from './types'
import { dumpD, logD } from '@this/configuration'

export const polarity = (item: TimeRecord): object | number | string =>
  item.action === `decrement` ? -Number(item.value) : item.value

type StatFunc = (numbers: number[], items: TRecord[]) => any
type CompareFn = (a: number, b: number) => number
const CompareNumbers: CompareFn = (a, b) => a - b

export const binarySearch = (arr: number[], el: number, compareFn: CompareFn = CompareNumbers): number => {
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

/** One millisecond in nanoseconds. */
const MILLISECOND = 1_000_000
const ONE_MIN = 60_000
const ONE_HOUR = 3_600_000
const SECTIONS = 10

/** gradation should be 1min, 5min, 10min, 15min, 30min, 1h */
const proposedRangesMs = [
  ONE_MIN, // 1min
  5 * ONE_MIN,
  10 * ONE_MIN,
  15 * ONE_MIN,
  30 * ONE_MIN,
  60 * ONE_MIN, // 1h
]

/** calculate optimal range duration in milliseconds */
const findOptimalScale = (minMs: number, maxMs: number): [number[], string[], Map<string, number>] => {
  // it should be not more than 10 ranges. minimal range is 1min, maximal is 1h
  const rangeMs = Math.max(ONE_MIN, Math.min(ONE_HOUR, Math.ceil((maxMs - minMs) / SECTIONS / ONE_MIN) * ONE_MIN))
  const rangeIndex = Math.abs(binarySearch(proposedRangesMs, rangeMs))
  const range = proposedRangesMs[rangeIndex]

  // compose array of new ranges started from minMs and ended with maxMs
  const ranges: number[] = []
  const labels: string[] = []
  for (let i = minMs, j = 0; i <= maxMs + range; i += range, j += range) {
    ranges.push(Math.round(i) * MILLISECOND)
    labels.push(`[${j}..${j + range})`)
  }

  const init = labels.reduce((acc, range) => acc.set(range, 0), new Map())
  return [ranges, labels, init]
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
    case `frequency`:
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      return (numbers: number[]) => numbers.reduce((acc, e) => acc.set(e, (acc.get(e) || 0) + 1), new Map())
    case `range`:
      return (_numbers: number[], items: TRecord[]) => {
        // find min and max timestamps in items
        const timestamps = items.map((item: any) => item.timestamp)

        // convert timestamps to nanoseconds to milliseconds and find min and max
        const minMs: number = Math.round(Math.min(...timestamps) / 1_000_000)
        const maxMs: number = Math.round(Math.max(...timestamps) / 1_000_000)
        const [ranges, labels, initials] = findOptimalScale(minMs, maxMs)

        // calculate number of items in each range
        const map = items.reduce((acc: any, item: TRecord) => {
          const rangeIndex = Math.abs(binarySearch(ranges, Number(item.timestamp))) - 1
          const sum = acc.get(labels[rangeIndex]) + Number(item.value)
          return acc.set(labels[rangeIndex], sum)
        }, initials)

        return {
          units: `milliseconds`,
          map,
          duration: `${(maxMs - minMs) / 1000}sec`,
          avg: sl.mean([...map.values()]),
        }
      }
    case `duration`:
      return (_numbers: number[], items: TRecord[]) => {
        const rawValues = items.map((item) => item.value as number)
        const minMs = Math.round(Math.min(...rawValues) / MILLISECOND)
        const maxMs = Math.round(Math.max(...rawValues) / MILLISECOND)

        const ranges = items
          .map((item) => ({ label: item.tag, value: (item.value as number) / MILLISECOND }))
          .sort((a, b) => CompareNumbers(a.value, b.value))

        return {
          units: `milliseconds`,
          min: minMs,
          max: maxMs,
          timeline: items.map((item) => [item.timestamp, item.tag, (item.value as number) / MILLISECOND]),
          mapping: ranges.map(({ label, value }) => [label, value]),
          avg: sl.mean(rawValues) / MILLISECOND,
          count: rawValues.length,
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

  // process series with durations
  Object.entries(schema)
    .filter(([, value]) => value.operation === `duration`)
    .forEach(([key]) => {
      const { values } = series[key]
      const converted = values.reduce((acc, item) => {
        return acc.set(item.value as string, [...(acc.get(item.value as string) ?? []), item])
      }, new Map<string, TRecord[]>())
      dumpD(`converted: %O`, converted)

      const preFinals = [...converted.entries()].reduce((acc, entry) => {
        const [key, records] = entry
        const value: TRecord[] = []

        for (let i = 0; i < records.length; i += 2) {
          const [first, second] = records.slice(i, i + 2)
          const duration = Number(second.timestamp) - Number(first.timestamp)
          value.push({ timestamp: first.timestamp, action: first.action, value: duration, tag: first.value })
        }

        return acc.set(key, value)
      }, new Map<string, TRecord[]>())
      dumpD(`preFinals: %O`, preFinals)

      const finals: TRecord[] = [...preFinals.entries()]
        .map(([, records]) => records)
        .flat()
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
      dumpD(`finals: %O`, finals)

      series[key].values = finals
    })

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
      // console.error(`error. series ['${key}'] = `, series[key])
      return { ...acc, [key]: `error` }
    }
  }, {})

  return { statistics, from, to, schema }
}
