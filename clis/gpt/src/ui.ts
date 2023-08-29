/* eslint-disable new-cap */
import Spinnies from 'dreidels'
import chalk from 'chalk'
import { v4 as uuid } from 'uuid'
import { type OnProgressCallback, type PromisePool, type PromisePoolError } from '@supercharge/promise-pool'
import { type PromisePoolExecutor } from '@supercharge/promise-pool/dist/promise-pool-executor'

import { type JobContext, type UiStrategy } from './types'

/** Extract cause from the errors array */
const reportErrorsMessages = <T>(errors?: Array<PromisePoolError<T>>): string => {
  return (errors ?? [])
    .map((error) => {
      onFail(`error: ${JSON.stringify(error)}`)
      const stackFirstLine = error.stack?.split(`\n`)[0] ?? ``
      return `${error.message} <~ ${stackFirstLine}`
    })
    .join(`, `)
}

// make typescript happy, isBun is runtime variable specific to BUN runtime
declare let process: {
  isBun: boolean
}

// @ts-expect-error something wrong with package, ts-node badly extract the class
export const spinnies = process.isBun ? new Spinnies() : new Spinnies.default()

export const withUI = <T>(context: JobContext, pool: PromisePool<T>): PromisePool<T> => {
  const { source } = context.job
  spinnies.add(source, { text: `Translating: ${source}` })

  /** refresh the progress on any job start or finish. When detected that all jobs processed - finalize progress. */
  const progress: OnProgressCallback<T> = (_v, pool) => {
    const executor = pool as PromisePoolExecutor<T, any>
    const active = pool.activeTasksCount()
    const processed = pool.processedCount()
    const progress = pool.processedPercentage().toFixed(1)
    const totalJobs = executor.itemsCount()
    const totalErrors = executor.errors().length

    if (totalJobs === processed) {
      if (totalErrors > 0) {
        spinnies.fail(source, {
          text: `Failed: ${chalk.yellow(source)}, errors: ${reportErrorsMessages(executor.errors())}`,
        })
      } else {
        spinnies.succeed(source, {
          text: `Processed: ${chalk.yellow(source)}`,
        })
      }
    } else {
      spinnies.update(source, {
        text: `Translating: ${chalk.yellow(source)}, pipe: ${active}|${processed}|${totalJobs}|${progress}%`,
      })
    }
  }

  return pool.onTaskStarted(progress).onTaskFinished(progress)
}

export const onScreen = (line: string, ...rest: any[]): void => {
  console.log(line, ...rest)
}

export const onSuccess = (line: string): void => {
  const uniqueId = `success-${uuid()}`
  try {
    spinnies.add(uniqueId, { text: line }).succeed({ text: line }).remove(uniqueId)
  } catch (ignored) {}
}

export const onFail = (line: string): void => {
  const uniqueId = `fail-${uuid()}`
  try {
    spinnies.add(uniqueId, { text: line }).fail({ text: line }).remove(uniqueId)
  } catch (ignored) {}
}

export const ConsoleUi: UiStrategy = {
  title: `Console UI`,
  description: `Show all messages in console`,
}

export default ConsoleUi

// Refs:
// - https://github.com/sindresorhus/ora
// - https://github.com/jbcarpanelli/spinnies
//   - https://github.com/SweetMNM/dreidels (spinnies fork with enhancements)
// - https://github.com/SamVerschueren/listr
// - https://github.com/LaboratorioInternacionalWeb/Multispinners
// - https://github.com/sindresorhus/cli-spinners
//
// Graphs:
// - https://www.npmjs.com/package/asciichart
// - https://www.npmjs.com/package/cli-graph
