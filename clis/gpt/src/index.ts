import { log, environmentFiles } from '@this/configuration'
import { critical, emitter, Events, safe } from './gc'
import { initialize, main } from './main'

log(`loaded environment files: %O`, environmentFiles())
log(`node version: %o`, process.versions.node)

emitter.on(Events.init, critical(initialize))
emitter.on(Events.main, safe(main))

// start the app
emitter.emit(Events.init, process.argv)

export { emitter }
