export interface Metrics {
  impression: (name: string, payload: any) => void
  action: (name: string, payload: any) => void
  increment: (name: string, value: number) => void
  decrement: (name: string, value: number) => void
  value: (name: string, value: number) => void
  duration: (name: string, value: number | string) => void
}

export type Actions = keyof Metrics

export type Operations =
  | `sum`
  | `avg`
  | `min`
  | `max`
  | `counter`
  | `histogram`
  | `percentile`
  | `frequency`
  | `range`
  | `duration`

export interface KPI {
  description: string
  operation: Operations
}

export interface TRecord {
  timestamp: bigint
  value: object | number | string
  action: Actions
  tag?: any
}
export interface TimeRecord extends TRecord {
  name: string
}

export type Series = Record<string, { values: TRecord[] }>

export type Schema<T extends keyof any> = Record<T, KPI>

export interface Finals<T extends keyof any = any> {
  statistics: Record<T, any>
  from: bigint
  to: bigint
  schema: Schema<T>
}

export interface Statistics extends Metrics {
  stats: <T extends keyof any>(from: bigint, to: bigint, schema: Schema<T>) => Promise<Finals<T>>
}

export interface Telemetry extends Statistics {
  // TODO (olku): reserved for future use
}
