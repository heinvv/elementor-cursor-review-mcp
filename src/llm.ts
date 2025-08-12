import { Rule } from './rules'
import { Finding } from './types'

export function buildLLMPrompt(params: {
  filePath: string
  addedLines: string[]
  rules: Rule[]
}): string {
  const { filePath, addedLines, rules } = params
  const rulesText = rules
    .map((r) => `- ${r.metadata.title} [${r.metadata.severity}] (${r.metadata.category})\n${r.content}`)
    .join('\n\n')

  return [
    'You are a strict code review assistant. Review only the ADDED LINES against the provided guidelines.',
    'Return a compact JSON array of findings with this shape:',
    '[{ "message": string, "line": number, "ruleId"?: string, "severity"?: "error"|"warning"|"info" }]',
    '',
    `File: ${filePath}`,
    'Added lines:',
    addedLines.map((l, i) => `${i + 1}: ${l}`).join('\n'),
    '',
    'Guidelines:',
    rulesText,
  ].join('\n')
}

export function parseLLMFindings(jsonText: string, filePath: string): Finding[] {
  try {
    const arr = JSON.parse(jsonText)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x) => x && typeof x.message === 'string' && typeof x.line === 'number')
      .map((x) => ({
        path: filePath,
        position: Number(x.line) || 1,
        message: String(x.message),
        ruleId: typeof x.ruleId === 'string' ? x.ruleId : undefined,
        severity: ['error', 'warning', 'info'].includes(x.severity) ? x.severity : undefined,
      }))
  } catch {
    return []
  }
}


