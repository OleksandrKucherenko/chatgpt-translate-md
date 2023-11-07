import path from 'node:path'
import fs from 'node:fs'
import { appendFile } from 'node:fs/promises'
import Papa from 'papaparse'

import { Dirs } from '@this/configuration'
import { type Telemetry, type TimeRecord, type Finals, type Schema, type Metrics } from './types'
import { stats } from './functions'

export const metrics = (session: string): Telemetry => {
  // compose output directory for session
  fs.mkdirSync(path.resolve(Dirs.local, session), { recursive: true })

  // create telemetry CSV file if it not exists yet
  const telemetryFile = path.resolve(Dirs.local, session, `telemetry.csv`)
  fs.existsSync(telemetryFile) || fs.writeFileSync(telemetryFile, `timestamp,name,action,value\n`)

  return {
    /** increment metric, report increment */
    increment(name: string, value: number): Metrics {
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},increment,${value}\n`)
        .then(() => {})
        .catch(() => {})

      return this
    },

    /** decrement metric, report decrement */
    decrement(name: string, value: number): Metrics {
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},decrement,${value}\n`)
        .then(() => {})
        .catch(() => {})

      return this
    },

    /** report metric value at specific time. */
    value(name: string, value: number): Metrics {
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},value,${value}\n`)
        .then(() => {})
        .catch(() => {})

      return this
    },

    /** report impression event at specific time. */
    impression(name: string, payload: any): Metrics {
      const json = Papa.unparse([JSON.stringify(payload)])
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},impression,${json}\n`)
        .then(() => {})
        .catch(() => {})

      return this
    },

    /** report action event at specific time. */
    action(name: string, payload: any): Metrics {
      const json = Papa.unparse([JSON.stringify(payload)])
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},action,${json}\n`)
        .then(() => {})
        .catch(() => {})

      return this
    },

    /** At least two calls of this function required. Duration is a distance in time between those two calls. */
    duration(name: string, value: number | string): Metrics {
      appendFile(telemetryFile, `${process.hrtime.bigint()},${name},duration,${value}\n`)
        .then(() => {})
        .catch(() => {})

      return this
    },

    /** calculate statistics in specified time range by rules of provided schema. */
    async stats(from: bigint, to: bigint, schema: Schema<any>): Promise<Finals> {
      // read telemetry file
      const data: TimeRecord[] = await new Promise((resolve, _reject) => {
        const readableStream = fs.createReadStream(telemetryFile)
        Papa.parse<TimeRecord>(readableStream, {
          header: true,
          complete: (results, _file) => {
            resolve(results.data)
          },
        })
      })

      // calculate statistics
      return await stats(from, to, schema, data)
    },
  }
}
