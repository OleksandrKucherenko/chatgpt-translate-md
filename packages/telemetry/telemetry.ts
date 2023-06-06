import path from 'node:path'
import fs from 'node:fs'
import { appendFile } from 'node:fs/promises'
import Papa from 'papaparse'

import { Dirs } from '@this/configuration'

export interface Metrics {
  impression: (name: string, payload: any) => void
  action: (name: string, payload: any) => void
  increment: (name: string, value: number) => void
  decrement: (name: string, value: number) => void
  value: (name: string, value: number) => void
  duration: (name: string, value: number | string) => void
  stats: <T extends keyof any>(from: bigint, to: bigint, schema: Schema<T>) => object
}

export type Actions = `increment` | `decrement` | `value` | `impression` | `action` | `duration`
export type Operations = `sum` | `avg` | `min` | `max` | `counter` | `histogram` | `percentile`
export interface KPI {
  description: string
  operation: Operations
}

export interface TimeRecord {
  timestamp: bigint
  action: Actions
  value: any | number
}

export type Schema<T extends keyof any> = Record<T, Operations | KPI>

export interface Telemetry extends Metrics {
  // TODO (olu): reserved for future use
}

export const metrics = (session: string): Telemetry => {
  const telemetryFile = path.resolve(Dirs.local, session, `telemetry.csv`)
  fs.writeFileSync(telemetryFile, `timestamp,name,action,value\n`)

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
    stats(from: bigint, to: bigint, schema: Schema<any>): object {
      const statistics = Object.keys(schema).reduce((acc, key) => ({ [key]: 0, ...acc }), {})

      // TODO (olku): calculate statistics

      return { ...statistics, from, to, schema }
    },
  }
}
