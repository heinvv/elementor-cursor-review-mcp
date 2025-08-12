#!/usr/bin/env node
import { z } from 'zod';
import { fetchPR, extractAddedLines, getAddedLinesWithPositions } from './github';
import { analyzeAddedLines } from './analyze';
import { postReviewComments } from './post-comments';
import { RuleLoader } from './rules';
import { buildLLMPrompt, parseLLMFindings } from './llm';

const argsSchema = z.object({
  prRef: z.string().min(1),
}).or(
  z.object({ prRef: z.string().default(''), }).partial()
)

type CLIOptions = {
  prRef?: string
  showRules?: boolean
  exportPromptsDir?: string
  ingestResultsDir?: string
  dryRun: boolean
}

function parseCliArgs(): CLIOptions {
  const opts: CLIOptions = { dryRun: process.env.DRY_RUN !== 'false' }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--show-rules' || a === '-r') {
      opts.showRules = true
      continue
    }
    if (a === '--export-prompts') {
      opts.exportPromptsDir = argv[i + 1]
      i += 1
      continue
    }
    if (a === '--ingest-results') {
      opts.ingestResultsDir = argv[i + 1]
      i += 1
      continue
    }
    if (a === '--no-dry-run') {
      opts.dryRun = false
      continue
    }
    if (!a.startsWith('-') && !opts.prRef) {
      const parsed = argsSchema.safeParse({ prRef: a })
      if (!parsed.success) continue
      opts.prRef = a
    }
  }

  if (!opts.showRules && !opts.prRef) {
    console.error('Usage: node dist/index.js <PR_URL_OR_NUMBER> [--export-prompts <dir>] [--ingest-results <dir>] [--no-dry-run]')
    console.error('       node dist/index.js --show-rules')
    process.exit(1)
  }

  return opts
}

function parsePrRef(input: string): { owner?: string; repo?: string; prNumber: string } {
  const urlMatch = input.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], prNumber: urlMatch[3] };
  }
  const numberMatch = input.match(/^\d+$/);
  if (numberMatch) {
    return { prNumber: input };
  }
  return { prNumber: input };
}

async function main(): Promise<void> {
  const cli = parseCliArgs();
  
  // Check for special flags
  if (cli.showRules) {
    const ruleLoader = new RuleLoader();
    const rules = ruleLoader.loadRules();
    
    console.log('\n=== LOADED RULES ===');
    console.log(`Found ${rules.length} rules:\n`);
    
    for (const rule of rules) {
      console.log(`📋 ${rule.metadata.title} (${rule.metadata.severity})`);
      console.log(`   Category: ${rule.metadata.category}`);
      console.log(`   File patterns: ${rule.metadata.filePatterns.join(', ')}`);
      console.log(`   Content preview: ${rule.content.substring(0, 100)}...`);
      console.log('');
    }
    
    console.log('\n=== FORMATTED FOR LLM ===');
    console.log(ruleLoader.formatRulesForLLM(rules));
    return;
  }
  
  const parsed = parsePrRef(String(cli.prRef));
  
  const owner = parsed.owner || process.env.GITHUB_DEFAULT_OWNER || 'elementor';
  const repo = parsed.repo || process.env.GITHUB_DEFAULT_REPO || 'hello-commerce';
  
  if (!parsed.owner && !process.env.GITHUB_DEFAULT_OWNER) {
    console.log(`Using default owner: ${owner}`);
  }
  if (!parsed.repo && !process.env.GITHUB_DEFAULT_REPO) {
    console.log(`Using default repo: ${repo}`);
  }
  
  console.log(`Fetching PR #${parsed.prNumber} from ${owner}/${repo}...`);
  
  try {
    const prData = await fetchPR(owner, repo, parsed.prNumber);
    
    // Load rules
    const ruleLoader = new RuleLoader();
    const rules = ruleLoader.loadRules();
    
    console.log('\n=== PR INFO ===');
    console.log(`Title: ${prData.title}`);
    console.log(`State: ${prData.state}`);
    console.log(`Files changed: ${prData.files.length}`);
    console.log(`Rules loaded: ${rules.length}`);
    
    console.log('\n=== CHANGED FILES ===');
    const allFindings = [] as ReturnType<typeof analyzeAddedLines>;
    for (const file of prData.files) {
      console.log(`\n${file.filename} (${file.status})`);
      console.log(`  +${file.additions} -${file.deletions}`);
      
      if (file.patch) {
        const addedLines = extractAddedLines(file.patch);
        if (addedLines.length > 0) {
          console.log('  Added lines:');
          addedLines.slice(0, 5).forEach(line => {
            console.log(`    ${line}`);
          });
          if (addedLines.length > 5) {
            console.log(`    ... and ${addedLines.length - 5} more`);
          }

          // Heuristic analyzer for now
          const addedWithPos = getAddedLinesWithPositions(file.patch);
          const findings = analyzeAddedLines(file.filename, addedWithPos.map(x => x.line));
          // Map findings to diff positions (best effort; we used index-based earlier)
          findings.forEach((f) => {
            const idx = f.position - 1;
            if (addedWithPos[idx]) f.position = addedWithPos[idx].position;
          });
          if (findings.length > 0) {
            allFindings.push(...findings);
          }
        }
      }
    }
    
    if (rules.length > 0) {
      console.log('\n=== READY FOR ANALYSIS ===');
      console.log('✅ PR content fetched');
      console.log('✅ Rules loaded');
      console.log('🚀 Prompt export available via --export-prompt <file>');
    }

    if (allFindings.length > 0) {
      console.log(`\n=== HEURISTIC FINDINGS (${allFindings.length}) ===`);
      allFindings.slice(0, 10).forEach(f => {
        console.log(`- ${f.path} @${f.position}: ${f.message}`);
      });
      if (allFindings.length > 10) {
        console.log(`... and ${allFindings.length - 10} more`);
      }

      const dryRun = cli.dryRun;
      await postReviewComments({
        owner,
        repo,
        pullNumber: Number(parsed.prNumber),
        findings: allFindings,
        dryRun,
      });
      console.log(dryRun ? '\n[DRY RUN] Review comments not posted' : '\nReview comments posted');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});


