import { Octokit } from '@octokit/rest';
import { config } from 'dotenv';

config();

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  return new Octokit({ auth: token });
}

export interface PRData {
  number: number;
  title: string;
  body: string;
  state: string;
  files: Array<{
    filename: string;
    status: string;
    patch?: string;
    additions: number;
    deletions: number;
  }>;
}

export async function fetchPR(owner: string, repo: string, prNumber: string): Promise<PRData> {
  try {
    const octokit = getOctokit();
    const [prResponse, filesResponse] = await Promise.all([
      octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: parseInt(prNumber, 10),
      }),
      octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: parseInt(prNumber, 10),
      }),
    ]);

    const pr = prResponse.data;
    const files = filesResponse.data;

    return {
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      state: pr.state,
      files: files.map(file => ({
        filename: file.filename,
        status: file.status,
        patch: file.patch,
        additions: file.additions,
        deletions: file.deletions,
      })),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch PR: ${error.message}`);
    }
    throw new Error('Failed to fetch PR: Unknown error');
  }
}

export function extractAddedLines(patch: string): string[] {
  if (!patch) return [];
  
  return patch
    .split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.slice(1));
}

export function getAddedLinesWithPositions(patch: string): { line: string; position: number }[] {
  if (!patch) return [];
  const result: { line: string; position: number }[] = [];
  const lines = patch.split('\n');
  let position = 0;
  for (const raw of lines) {
    const isAdd = raw.startsWith('+') && !raw.startsWith('+++');
    const isRemove = raw.startsWith('-') && !raw.startsWith('---');
    if (isAdd) {
      position += 1;
      result.push({ line: raw.slice(1), position });
    } else if (isRemove) {
      position += 1;
    } else {
      position += 1;
    }
  }
  return result;
}
