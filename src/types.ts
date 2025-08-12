export type Severity = 'error' | 'warning' | 'info'

export interface Finding {
  path: string
  position: number
  message: string
  ruleId?: string
  severity?: Severity
}


