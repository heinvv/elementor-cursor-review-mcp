import { Octokit } from '@octokit/rest'
import { Finding } from './types'

export async function postReviewComments(params: {
  owner: string
  repo: string
  pullNumber: number
  findings: Finding[]
  token?: string
  dryRun?: boolean
}): Promise<void> {
  const { owner, repo, pullNumber, findings, token = process.env.GITHUB_TOKEN, dryRun = true } = params

  if (findings.length === 0) return

  if (dryRun) {
    console.log(`\n[DRY RUN] Would post ${findings.length} review comments`)
    findings.slice(0, 5).forEach((f) => {
      console.log(`- ${f.path} @${f.position}: ${f.message}`)
    })
    if (findings.length > 5) console.log(`...and ${findings.length - 5} more`)
    return
  }

  if (!token) {
    throw new Error('GITHUB_TOKEN is required to post comments')
  }

  const octokit = new Octokit({ auth: token })

  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    event: 'COMMENT',
    comments: findings.map((f) => ({
      path: f.path,
      position: f.position,
      body: `${f.message}${f.ruleId ? ` (rule: ${f.ruleId})` : ''}`,
    })),
  })
}


