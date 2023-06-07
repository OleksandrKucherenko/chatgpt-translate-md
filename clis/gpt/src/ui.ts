import Spinnies from 'spinnies'
import chalk from 'chalk'
import { type OnProgressCallback, type PromisePool, type PromisePoolError } from '@supercharge/promise-pool'
import { type PromisePoolExecutor } from '@supercharge/promise-pool/dist/promise-pool-executor'

import { type JobContext, type UiStrategy } from './types'

const reportErrorsMessages = <T>(errors?: Array<PromisePoolError<T>>): string => {
  console.log(`errors: `, JSON.stringify(errors, null, 2))

  return (errors ?? [])
    .map((error) => {
      const stackFirstLine = error.stack?.split(`\n`)[0] ?? ``
      return `${error.message} / ${stackFirstLine}`
    })
    .join(`, `)
}

const spinnies = new Spinnies()

export const withUI = <T>(context: JobContext, pool: PromisePool<T>): PromisePool<T> => {
  const { source } = context.job
  spinnies.add(source, { text: `Translating: ${source}` })

  /** refresh the progress on any job start or finish. When detected that all jobs processed - finalize progress. */
  const progress: OnProgressCallback<T> = (_v, pool) => {
    const executor = pool as PromisePoolExecutor<T, any>
    const active = pool.activeTasksCount()
    const processed = pool.processedCount()
    const progress = pool.processedPercentage().toFixed(1)
    const totalJobs = executor.items().length
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

export const onScreen = (line: string): void => {
  console.log(line)
}

export const onSuccess = (line: string): void => {
  spinnies.add(`success`, { text: line })
  spinnies.succeed(`success`, { text: line })
  spinnies.remove(`success`)
}

export const onFail = (line: string): void => {
  spinnies.add(`fail`, { text: line })
  spinnies.fail(`fail`, { text: line })
  spinnies.remove(`fail`)
}

export const ConsoleUi: UiStrategy = {
  title: `Console UI`,
  description: `Show all messages in console`,
}

export default ConsoleUi

// Refs:
// - https://github.com/sindresorhus/ora
// - https://github.com/jbcarpanelli/spinnies
// - https://github.com/SamVerschueren/listr
// - https://github.com/LaboratorioInternacionalWeb/Multispinners
// - https://github.com/sindresorhus/cli-spinners
//
// Graphs:
// - https://www.npmjs.com/package/asciichart
// - https://www.npmjs.com/package/cli-graph
