#!/usr/bin/env node
import { z } from 'zod';
import { fetchPR, extractAddedLines, getAddedLinesWithPositions } from './github.js';
import { analyzeAddedLines } from './analyze.js';
import { postReviewComments } from './post-comments.js';
import { RuleLoader } from './rules.js';
import { buildLLMPrompt, parseLLMFindings } from './llm.js';

// Simulate Cursor's LLM interface for now
// In a real MCP, this would be provided by Cursor's infrastructure
async function callCursorLLM(prompt: string): Promise<string> {
  // This is a placeholder - in actual Cursor MCP integration,
  // you would use Cursor's built-in LLM capabilities
  console.log('🤖 [SIMULATED] Calling Cursor LLM...');
  console.log(`   Prompt length: ${prompt.length} chars`);
  
  // For demonstration, analyze the prompt content and return relevant findings
  const hasEchoStatements = prompt.includes('echo "');
  const hasConditionals = prompt.includes('if [');
  const hasShellCommands = prompt.includes('cd ');
  
  const findings = [];
  
  if (hasEchoStatements) {
    findings.push({
      "message": "Consider using more structured logging instead of echo statements for better debugging",
      "line": 2,
      "ruleId": "general-quality",
      "severity": "info"
    });
  }
  
  if (hasConditionals && hasShellCommands) {
    findings.push({
      "message": "Shell script logic could be extracted to a separate script file for better maintainability",
      "line": 4,
      "ruleId": "general-quality", 
      "severity": "info"
    });
  }
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return JSON.stringify(findings);
}

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
  useLLM?: boolean
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
    if (a === '--use-llm') {
      opts.useLLM = true
      continue
    }
    if (!a.startsWith('-') && !opts.prRef) {
      const parsed = argsSchema.safeParse({ prRef: a })
      if (!parsed.success) continue
      opts.prRef = a
    }
  }

  if (!opts.showRules && !opts.prRef) {
    console.error('Usage: node dist/index.js <PR_URL_OR_NUMBER> [--use-llm] [--export-prompts <dir>] [--ingest-results <dir>] [--no-dry-run]')
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
    const analyses: Array<{ filePath: string; addedLines: string[]; addedWithPos: { line: string; position: number }[]; rulesForFile: ReturnType<RuleLoader['getRulesForFile']> }> = []
    const llmFindings = [] as typeof allFindings;
    
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
          const rulesForFile = ruleLoader.getRulesForFile(file.filename)
          analyses.push({ filePath: file.filename, addedLines, addedWithPos, rulesForFile })
          
          // Direct LLM analysis if requested
          if (cli.useLLM && rulesForFile.length > 0 && addedLines.length > 0) {
            console.log(`  🤖 Analyzing with Cursor LLM (${rulesForFile.length} rules)...`);
            try {
              const prompt = buildLLMPrompt({ filePath: file.filename, addedLines, rules: rulesForFile });
              const llmResponse = await callCursorLLM(prompt);
              const parsedFindings = parseLLMFindings(llmResponse, file.filename);
              
              // Map line numbers to diff positions
              parsedFindings.forEach((f) => {
                const idx = f.position - 1;
                if (addedWithPos[idx]) f.position = addedWithPos[idx].position;
              });
              
              if (parsedFindings.length > 0) {
                llmFindings.push(...parsedFindings);
                console.log(`  ✅ Found ${parsedFindings.length} LLM findings`);
              } else {
                console.log(`  ✅ No LLM findings`);
              }
            } catch (error) {
              console.error(`  ❌ LLM analysis failed: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
      }
    }
    
    if (rules.length > 0) {
      console.log('\n=== READY FOR ANALYSIS ===');
      console.log('✅ PR content fetched');
      console.log('✅ Rules loaded');
      if (cli.useLLM) {
        console.log('🤖 LLM analysis completed');
      } else {
        console.log('🚀 Use --use-llm for direct LLM analysis');
        console.log('🚀 Or --export-prompts <dir> for manual analysis');
      }
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

    // Post LLM findings if any
    if (llmFindings.length > 0) {
      console.log(`\n=== LLM FINDINGS (${llmFindings.length}) ===`);
      llmFindings.slice(0, 10).forEach(f => {
        console.log(`- ${f.path} @${f.position}: ${f.message} ${f.ruleId ? `(${f.ruleId})` : ''}`);
      });
      if (llmFindings.length > 10) {
        console.log(`... and ${llmFindings.length - 10} more`);
      }

      const dryRun = cli.dryRun;
      await postReviewComments({
        owner,
        repo,
        pullNumber: Number(parsed.prNumber),
        findings: llmFindings,
        dryRun,
      });
      console.log(dryRun ? '\n[DRY RUN] LLM review comments not posted' : '\nLLM review comments posted');
    }

    // Export prompts if requested
    if (cli.exportPromptsDir) {
      const fs = await import('fs')
      const path = await import('path')
      const dir = path.resolve(cli.exportPromptsDir)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const promptsDir = dir
      const resultsDir = path.join(dir, 'results')
      if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })
      const manifest: Array<{ filePath: string; promptPath: string; expectedResultPath: string }> = []
      analyses.forEach((a) => {
        const safeName = a.filePath.replace(/[^a-z0-9_.-]/gi, '_')
        const prompt = buildLLMPrompt({ filePath: a.filePath, addedLines: a.addedLines, rules: a.rulesForFile })
        const promptPath = path.join(promptsDir, `${safeName}.prompt.txt`)
        const expectedResultPath = path.join(resultsDir, `${safeName}.json`)
        fs.writeFileSync(promptPath, prompt, 'utf8')
        manifest.push({ filePath: a.filePath, promptPath, expectedResultPath })
      })
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
      console.log(`\nExported ${manifest.length} prompts to ${promptsDir}`)
      console.log(`Write LLM JSON results to the corresponding files under ${resultsDir} and re-run with --ingest-results ${resultsDir}`)
    }

    // Ingest results if requested
    if (cli.ingestResultsDir) {
      const fs = await import('fs')
      const path = await import('path')
      const dir = path.resolve(cli.ingestResultsDir)
      if (!fs.existsSync(dir)) {
        console.error(`Results directory not found: ${dir}`)
        process.exit(1)
      }
      const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.json'))
      const llmFindings = [] as typeof allFindings
      for (const fileName of files) {
        const full = path.join(dir, fileName)
        const base = fileName.replace(/\.json$/, '')
        const analysis = analyses.find((a) => a.filePath.replace(/[^a-z0-9_.-]/gi, '_') === base)
        if (!analysis) continue
        const text = fs.readFileSync(full, 'utf8')
        const parsedFindings = parseLLMFindings(text, analysis.filePath)
        // map line numbers to diff positions
        parsedFindings.forEach((f) => {
          const idx = f.position - 1
          if (analysis.addedWithPos[idx]) f.position = analysis.addedWithPos[idx].position
        })
        llmFindings.push(...parsedFindings)
      }
      if (llmFindings.length > 0) {
        console.log(`\n=== LLM FINDINGS (${llmFindings.length}) ===`)
        llmFindings.slice(0, 10).forEach((f) => console.log(`- ${f.path} @${f.position}: ${f.message}`))
        const dryRun = cli.dryRun
        await postReviewComments({ owner, repo, pullNumber: Number(parsed.prNumber), findings: llmFindings, dryRun })
        console.log(dryRun ? '\n[DRY RUN] LLM review comments not posted' : '\nLLM review comments posted')
      } else {
        console.log('\nNo LLM findings ingested.')
      }
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


