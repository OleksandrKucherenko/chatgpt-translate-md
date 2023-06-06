export interface Finals {
  statistics: any
  from: bigint
  to: bigint
  schema: any
}

export interface Metrics {
  impression: (name: string, payload: any) => void
  action: (name: string, payload: any) => void
  increment: (name: string, value: number) => void
  decrement: (name: string, value: number) => void
  value: (name: string, value: number) => void
  duration: (name: string, value: number | string) => void
  stats: <T extends keyof any>(from: bigint, to: bigint, schema: Schema<T>) => Promise<Finals>
}

export type Actions = `increment` | `decrement` | `value` | `impression` | `action` | `duration`
export type Operations = `sum` | `avg` | `min` | `max` | `counter` | `histogram` | `percentile` | `frequiency` | `range`
export interface KPI {
  description: string
  operation: Operations
}

export interface TRecord {
  timestamp: bigint
  value: object | number | string
  action: Actions
}
export interface TimeRecord extends TRecord {
  name: string
}

export type Series = Record<string, { values: TRecord[] }>

export type Schema<T extends keyof any> = Record<T, Operations | KPI>

export interface Telemetry extends Metrics {
  // TODO (olu): reserved for future use
}
