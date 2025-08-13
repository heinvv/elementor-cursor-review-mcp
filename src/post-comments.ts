import { Octokit } from '@octokit/rest'
import type { Finding } from './types.js'
import { createHash } from 'crypto'

type PostParams = {
  owner: string
  repo: string
  pullNumber: number
  findings: Finding[]
  token?: string
  dryRun?: boolean
}

function buildSignature(f: Finding): string {
  const sigBase = `${f.path}|${f.position}|${f.ruleId ?? ''}|${f.message}`
  return createHash('sha256').update(sigBase).digest('hex').slice(0, 16)
}

function formatCommentBody(f: Finding): string {
  const parts = [f.message]
  if (f.ruleId) parts.push(`(rule: ${f.ruleId})`)
  const sig = buildSignature(f)
  parts.push(`<!-- mcp:sig=${sig} -->`)
  return parts.join(' ')
}

async function listExistingSignatures(octokit: Octokit, owner: string, repo: string, pullNumber: number): Promise<Set<string>> {
  const signatures = new Set<string>()
  // Iterate review comments (not issue comments) to match inline
  let page = 1
  // Cap pages to avoid over-fetching
  while (page <= 10) {
    const res = await octokit.rest.pulls.listReviewComments({ owner, repo, pull_number: pullNumber, per_page: 100, page })
    if (res.data.length === 0) break
    for (const c of res.data) {
      const m = c.body?.match(/<!--\s*mcp:sig=([a-f0-9]{8,})\s*-->/i)
      if (m) signatures.add(m[1])
    }
    if (res.data.length < 100) break
    page += 1
  }
  return signatures
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function postReviewComments(params: PostParams): Promise<void> {
  const { owner, repo, pullNumber, findings, token = process.env.GITHUB_TOKEN, dryRun = true } = params

  if (findings.length === 0) return

  const octokit = new Octokit({ auth: token })

  // Dedupe by signature
  const existing = await listExistingSignatures(octokit, owner, repo, pullNumber)
  const newFindings = findings.filter((f) => !existing.has(buildSignature(f)))

  if (newFindings.length === 0) {
    console.log('\nNo new comments to post (all duplicates).')
    return
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would post ${newFindings.length} review comments`)
    newFindings.slice(0, 5).forEach((f) => {
      console.log(`- ${f.path} @${f.position}: ${formatCommentBody(f)}`)
    })
    if (newFindings.length > 5) console.log(`...and ${newFindings.length - 5} more`)
    return
  }

  if (!token) {
    throw new Error('GITHUB_TOKEN is required to post comments')
  }

  // GitHub annotations/comments have limits per request; use batches
  const batches = chunk(newFindings, 50)
  for (const batch of batches) {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event: 'COMMENT',
      comments: batch.map((f) => ({ path: f.path, position: f.position, body: formatCommentBody(f) })),
    })
  }
}


