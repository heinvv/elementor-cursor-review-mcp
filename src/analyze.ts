import { Finding } from './types'

export function analyzeAddedLines(path: string, addedLines: string[]): Finding[] {
  const findings: Finding[] = []

  // Heuristic rule: flag TODO in added lines
  addedLines.forEach((line, idx) => {
    if (/\bTODO\b/i.test(line)) {
      findings.push({
        path,
        position: idx + 1,
        message: 'Avoid TODO comments. Create a ticket and reference it explicitly or remove the comment.',
        ruleId: 'avoid-todo-comments',
        severity: 'warning',
      })
    }
  })

  return findings
}


