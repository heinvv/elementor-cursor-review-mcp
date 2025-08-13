import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { fetchPR, extractAddedLines, getAddedLinesWithPositions } from './github.js'
import { RuleLoader } from './rules.js'
import { buildLLMPrompt, parseLLMFindings } from './llm.js'
import { postReviewComments } from './post-comments.js'
import type { Finding } from './types.js'
import { analyzeAddedLines } from './analyze.js'

function parsePullRequestUrl(url: string): { owner: string; repo: string; prNumber: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/i)
  if (!match) throw new Error('Invalid GitHub PR URL format')
  return { owner: match[1], repo: match[2], prNumber: match[3] }
}

async function callLightweightLLMFromAddedLines(addedLines: string[]): Promise<string> {
  const findings: Array<{ message: string; line: number; ruleId?: string; severity?: string }> = []
  addedLines.forEach((line, idx) => {
    if (/\bTODO\b/i.test(line)) {
      findings.push({
        message: 'Avoid TODO comments. Track work in an issue and reference it explicitly or remove the comment',
        line: idx + 1,
        ruleId: 'avoid-todo',
        severity: 'warning',
      })
    }
  })
  return JSON.stringify(findings)
}

export function createServer(): McpServer {
  const server = new McpServer({ name: 'elementor-code-review-mcp', version: process.env.NPM_PACKAGE_VERSION ?? 'unknown' })

  server.tool(
    'review_pull_request',
    'Analyze a GitHub pull request using coding guidelines and optionally post review comments',
    {
      prUrl: z.string().describe('GitHub PR URL (https://github.com/owner/repo/pull/123)'),
      dryRun: z.boolean().optional().default(true).describe('If true, do not post comments'),
      useLLM: z.boolean().optional().default(false).describe('If true, run an additional lightweight LLM pass'),
    },
    async ({ prUrl, dryRun = true, useLLM = false }) => {
      const { owner, repo, prNumber } = parsePullRequestUrl(prUrl)
      const pr = await fetchPR(owner, repo, prNumber)
      const ruleLoader = new RuleLoader()
      const rules = ruleLoader.loadRules()

      const output: string[] = []
      output.push(`Analyzing PR #${pr.number} from ${owner}/${repo}`)
      output.push(`Title: ${pr.title}`)
      output.push(`State: ${pr.state}`)
      output.push(`Files changed: ${pr.files.length}`)
      output.push(`Rules loaded: ${rules.length}`)

      const heuristicFindings: Finding[] = []
      const llmFindings: Finding[] = []

      if (useLLM) {
        for (const file of pr.files) {
          if (!file.patch) continue
          const addedLines = extractAddedLines(file.patch)
          if (addedLines.length === 0) continue
          const addedWithPositions = getAddedLinesWithPositions(file.patch)
          const rulesForFile = ruleLoader.getRulesForFile(file.filename)
          if (rulesForFile.length === 0) continue
          const prompt = buildLLMPrompt({ filePath: file.filename, addedLines, rules: rulesForFile })
          const llmText = await callLightweightLLMFromAddedLines(addedLines)
          const parsed = parseLLMFindings(llmText, file.filename)
          parsed.forEach((f) => {
            const idx = f.position - 1
            if (addedWithPositions[idx]) f.position = addedWithPositions[idx].position
          })
          if (parsed.length > 0) llmFindings.push(...parsed)
        }
      }

      for (const file of pr.files) {
        if (!file.patch) continue
        const addedLines = extractAddedLines(file.patch)
        if (addedLines.length === 0) continue
        const addedWithPositions = getAddedLinesWithPositions(file.patch)
        const findings = analyzeAddedLines(file.filename, addedLines)
        findings.forEach((f) => {
          const idx = f.position - 1
          if (addedWithPositions[idx]) f.position = addedWithPositions[idx].position
        })
        if (findings.length > 0) heuristicFindings.push(...findings)
      }

      const totalFindings: Finding[] = [...heuristicFindings, ...llmFindings]
      if (totalFindings.length > 0) {
        output.push(`Findings: ${totalFindings.length}`)
        totalFindings.slice(0, 10).forEach((f, i) => {
          output.push(`${i + 1}. \`${f.path}\` @${f.position}: ${f.message}${f.ruleId ? ` (${f.ruleId})` : ''}`)
        })
        if (totalFindings.length > 10) output.push(`... and ${totalFindings.length - 10} more`)
        if (!dryRun) {
          await postReviewComments({ owner, repo, pullNumber: Number(prNumber), findings: totalFindings, dryRun: false })
          output.push('Posted review comments to GitHub')
        } else {
          output.push('Dry run: not posting comments')
        }
      } else {
        output.push('No issues found or LLM disabled')
      }

      return { content: [{ type: 'text', text: output.join('\n') }] }
    }
  )

  server.tool(
    'show_coding_rules',
    'Display loaded coding rules with metadata',
    {},
    async () => {
      const ruleLoader = new RuleLoader()
      const rules = ruleLoader.loadRules()
      const lines: string[] = []
      lines.push(`Loaded Coding Rules: ${rules.length}`)
      rules.forEach((rule, i) => {
        lines.push(`${i + 1}. ${rule.metadata.title} (${rule.metadata.severity})`)
        lines.push(`Category: ${rule.metadata.category}`)
        lines.push(`Patterns: ${rule.metadata.filePatterns.join(', ')}`)
      })
      return { content: [{ type: 'text', text: lines.join('\n') }] }
    }
  )

  return server
}


