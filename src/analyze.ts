import type { Finding } from './types.js'

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

  const isTypescriptFile = /\.(ts|tsx)$/.test(path)
  if (isTypescriptFile) {
    const filteredVariablesIndex = addedLines.findIndex((l) => /const\s+filteredVariables\s*=\s*variables\.filter\(/.test(l))
    const hasUseMemoInAdded = addedLines.some((l) => /useMemo\s*\(/.test(l))
    if (filteredVariablesIndex !== -1 && !hasUseMemoInAdded) {
      findings.push({
        path,
        position: filteredVariablesIndex + 1,
        message: 'Wrap derived arrays in useMemo with proper dependencies to avoid unnecessary recalculations.',
        ruleId: 'react-performance',
        severity: 'info',
      })
    }

    addedLines.forEach((line, idx) => {
      const usesLabelLower = /label\.toLowerCase\(\)/.test(line)
      if (usesLabelLower && !/\?\./.test(line)) {
        findings.push({
          path,
          position: idx + 1,
          message: 'Guard optional values when lowercasing: use label?.toLowerCase() and a safe default for searchValue.',
          ruleId: 'typescript-safety',
          severity: 'warning',
        })
      }
    })
  }

  return findings
}


