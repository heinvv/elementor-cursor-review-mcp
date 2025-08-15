import type { Finding } from './types.js'
import { RuleLoader, type Rule } from './rule-loader.js'

let ruleLoader: RuleLoader | null = null

function getRuleLoader(): RuleLoader {
  if (!ruleLoader) {
    ruleLoader = new RuleLoader('./rules')
    ruleLoader.loadRules()
  }
  return ruleLoader
}

export function analyzeAddedLines(path: string, addedLines: string[]): Finding[] {
  const findings: Finding[] = []
  const loader = getRuleLoader()
  const rules = loader.getRulesForFile(path)

  // Apply each rule to each added line
  rules.forEach(rule => {
    addedLines.forEach((line, idx) => {
      const pattern = new RegExp(rule.pattern)
      const matches = pattern.test(line)
      
      if (matches) {
        // Check negative pattern if it exists
        if (rule.negativePattern) {
          const negativePattern = new RegExp(rule.negativePattern)
          const hasNegativeMatch = addedLines.some(l => negativePattern.test(l))
          if (hasNegativeMatch) {
            return // Skip this finding
          }
        }

        findings.push({
          path,
          position: idx + 1,
          message: rule.message,
          ruleId: rule.id,
          severity: rule.severity,
        })
      }
    })
  })

  return findings
}


