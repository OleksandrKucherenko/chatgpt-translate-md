import ora from 'ora'
import { type OnProgressCallback, type PromisePool, type PromisePoolError } from '@supercharge/promise-pool'
import { type PromisePoolExecutor } from '@supercharge/promise-pool/dist/promise-pool-executor'

import { dumpD } from '@this/configuration'
import { type JobContext, type UiStrategy } from './types'

const reportErrorsMessages = <T>(errors: Array<PromisePoolError<T>>): string[] => {
  // TODO (olku): report errors messages to array
  dumpD(`reportErrorsMessages %O`, errors)

  return []
}

export const withUI = <T>(context: JobContext, pool: PromisePool<T>): PromisePool<T> => {
  // const startedAt = new Date()
  const { source } = context.job
  const spinner = ora(`Translating... ${source}`).start()

  /** refresh the progress on any job start or finish. When detected that all jobs processed - finalize progress. */
  const progress: OnProgressCallback<T> = (_v, pool) => {
    const executor = pool as PromisePoolExecutor<T, any>
    const active = pool.activeTasksCount()
    const processed = pool.processedCount()
    const progress = pool.processedPercentage().toFixed(1)
    // const time = `${new Date().getTime() - startedAt.getTime()}ms`
    const totalJobs = executor.items().length
    const totalErrors = executor.errors().length

    if (totalJobs === processed) {
      if (totalErrors > 0) {
        spinner.fail(`Failed ${source} with errors: ${reportErrorsMessages(executor.errors())}`)
      } else {
        spinner.succeed(`Processed: ${source}, stats: ${JSON.stringify(context.stats)}`)
      }
    } else {
      spinner.text = `Translating: ${active}|${processed}|${progress}%`
    }
  }

  return pool.onTaskStarted(progress).onTaskFinished(progress)
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
