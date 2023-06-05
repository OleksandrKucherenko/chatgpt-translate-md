import { EventEmitter } from 'eventemitter3'
import { log, Exits, type ExitsType } from '@this/configuration'

export type CleanupFn = () => void

/** key-to-function map that allows register replaceable cleanup functions. */
export const cleanupMap = new Map<string, CleanupFn>()

const gracefulCleanupMap: CleanupFn = (): void => {
  cleanupMap.forEach((release) => {
    release()
  })
  cleanupMap.clear()
}

/** collection of functions that should be execution during graceful shutdown. */
export const cleanupQueue: CleanupFn[] = [gracefulCleanupMap]

/** Cleanup resources in LIFO way. */
export const gracefulShutdown = (result: ExitsType = Exits.termination): void => {
  // LIFO order
  while (cleanupQueue.length > 0) {
    ;(cleanupQueue.pop() as CleanupFn)()
  }

  // noinspection TypeScriptValidateJSTypes
  process.exit(result.code)
}

/** minimalistic set of supported events. */
export enum Events {
  /** Application exit with graceful shutdown. */
  exit = `exit`,
  /** Unhandled error. */
  error = `error`,
  /**  */
  init = `init`,
  main = `main`,
}

/** events bus used for running the application code. */
export const emitter = new EventEmitter()

/** on EXIT signal, cleanup resources */
emitter.on(Events.exit, gracefulShutdown)

/** on ERROR signal, report error into stdout. */
emitter.on(Events.error, (error) => {
  // do not print stack trace for report of errors and abort operations
  if (error instanceof Error && error.cause === Exits.abort.code) {
    log(`%O`, error.message)
  } else if (error instanceof Error && error.cause === Exits.errors.code) {
    log(`%O`, error.message)
  } else {
    log(`${Exits.unhandled.name} %O`, error)
  }
})

const SIGTERM: NodeJS.Signals = `SIGTERM`

/** on SIGTERM signal kill app. */
process.on(SIGTERM, () => {
  log(`received SIGTERM signal`)
  emitter.emit(Events.exit, Exits.abort.code)
})

/** in case of exception terminate application. */
export const critical =
  <T>(fn: (args: T) => Promise<unknown>) =>
  async (arg: T) => {
    try {
      await fn(arg)
    } catch (error: any) {
      emitter.emit(Events.error, error)
      emitter.emit(Events.exit, Exits.unhandled.code)
    }
  }

/** in case of exception report error. Error handler should decide
 * is operation recoverable/repeatable or critical. */
export const safe =
  <T>(fn: (args: T) => Promise<unknown>) =>
  async (arg: T) => {
    try {
      await fn(arg)
    } catch (error: any) {
      emitter.emit(Events.error, error)
    }
  }
