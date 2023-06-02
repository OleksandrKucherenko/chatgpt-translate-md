import debug from 'debug'

export const log = debug(`app:main`)
export const logD = log.extend(`debug`)
export const logW = log.extend(`warning`)

export const dump = debug(`data:dump`)
export const dumpD = dump.extend(`debug`)

log.log = console.info.bind(console)
logD.log = console.debug.bind(console)
logW.log = console.warn.bind(console)
