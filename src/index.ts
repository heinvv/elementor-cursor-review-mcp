#!/usr/bin/env node
import { z } from 'zod';
import { fetchPR, extractAddedLines } from './github';
import { RuleLoader } from './rules';

const argsSchema = z.object({
  prRef: z.string().min(1),
  showRules: z.boolean().optional(),
});

function getCliArg(): string {
  const candidate = process.argv[2] ?? '';
  const parsed = argsSchema.safeParse({ prRef: candidate });
  if (!parsed.success) {
    console.error('Usage: node dist/index.js <PR_URL_OR_NUMBER>');
    console.error('Example: node dist/index.js https://github.com/elementor/hello-commerce/pull/203');
    console.error('Example: node dist/index.js 203 (requires GITHUB_DEFAULT_OWNER and GITHUB_DEFAULT_REPO env vars)');
    process.exit(1);
  }
  return parsed.data.prRef.trim();
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
  const prRefRaw = getCliArg();
  
  // Check for special flags
  if (prRefRaw === '--show-rules' || prRefRaw === '-r') {
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
  
  const parsed = parsePrRef(prRefRaw);
  
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
        }
      }
    }
    
    if (rules.length > 0) {
      console.log('\n=== READY FOR ANALYSIS ===');
      console.log('✅ PR content fetched');
      console.log('✅ Rules loaded');
      console.log('🚀 Ready for Phase 3: LLM Analysis');
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


