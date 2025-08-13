#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { fetchPR, extractAddedLines, getAddedLinesWithPositions } from './github.js';
import { RuleLoader } from './rules.js';
import { buildLLMPrompt, parseLLMFindings } from './llm.js';
import { postReviewComments } from './post-comments.js';

const server = new Server({
  name: 'elementor-cursor-review-mcp',
  version: '1.0.0',
});

// Schema for the review PR tool
const reviewPRSchema = z.object({
  prUrl: z.string().describe('GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)'),
  dryRun: z.boolean().optional().default(true).describe('Whether to do a dry run (true) or actually post comments (false)'),
  useLLM: z.boolean().optional().default(false).describe('Whether to use LLM analysis in addition to heuristics'),
});

const showRulesSchema = z.object({});

// Helper function to parse PR URL
function parsePrUrl(url: string): { owner: string; repo: string; prNumber: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/i);
  if (!match) {
    throw new Error('Invalid GitHub PR URL format. Expected: https://github.com/owner/repo/pull/123');
  }
  return {
    owner: match[1],
    repo: match[2],
    prNumber: match[3],
  };
}

// Simulate Cursor's LLM integration (in real MCP, this would use Cursor's LLM)
async function callLLM(prompt: string): Promise<string> {
  // In a real MCP, you would use Cursor's LLM capabilities here
  // For now, we'll simulate with basic pattern matching
  const hasEchoStatements = prompt.includes('echo "');
  const hasConditionals = prompt.includes('if [');
  const hasShellCommands = prompt.includes('cd ');
  const hasTodo = /\bTODO\b/i.test(prompt);
  
  const findings = [];
  
  if (hasTodo) {
    findings.push({
      message: "Avoid TODO comments. Create a ticket and reference it explicitly or remove the comment.",
      line: 1,
      ruleId: "avoid-todo",
      severity: "warning"
    });
  }
  
  if (hasEchoStatements) {
    findings.push({
      message: "Consider using more structured logging instead of echo statements for better debugging",
      line: 2,
      ruleId: "general-quality",
      severity: "info"
    });
  }
  
  if (hasConditionals && hasShellCommands) {
    findings.push({
      message: "Shell script logic could be extracted to a separate script file for better maintainability",
      line: 4,
      ruleId: "general-quality", 
      severity: "info"
    });
  }
  
  return JSON.stringify(findings);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'review_pull_request',
        description: 'Analyze a GitHub pull request using coding guidelines and post review comments',
        inputSchema: {
          type: 'object',
          properties: {
            prUrl: {
              type: 'string',
              description: 'GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)',
            },
            dryRun: {
              type: 'boolean',
              description: 'Whether to do a dry run (true) or actually post comments (false)',
              default: true,
            },
            useLLM: {
              type: 'boolean',
              description: 'Whether to use LLM analysis in addition to heuristics',
              default: false,
            },
          },
          required: ['prUrl'],
        },
      },
      {
        name: 'show_coding_rules',
        description: 'Display all loaded coding rules and their details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === 'review_pull_request') {
      const args = reviewPRSchema.parse(request.params.arguments);
      const { owner, repo, prNumber } = parsePrUrl(args.prUrl);
      
      // Fetch PR data
      const prData = await fetchPR(owner, repo, prNumber);
      
      // Load rules
      const ruleLoader = new RuleLoader();
      const rules = ruleLoader.loadRules();
      
      let output = [`🔍 **Analyzing PR #${prNumber} from ${owner}/${repo}**\n`];
      output.push(`**Title:** ${prData.title}`);
      output.push(`**State:** ${prData.state}`);
      output.push(`**Files changed:** ${prData.files.length}`);
      output.push(`**Rules loaded:** ${rules.length}\n`);
      
      const allFindings: any[] = [];
      const llmFindings: any[] = [];
      
      for (const file of prData.files) {
        if (!file.patch) continue;
        
        const addedLines = extractAddedLines(file.patch);
        if (addedLines.length === 0) continue;
        
        output.push(`📁 **${file.filename}** (+${file.additions} -${file.deletions})`);
        
        const addedWithPos = getAddedLinesWithPositions(file.patch);
        const rulesForFile = ruleLoader.getRulesForFile(file.filename);
        
        // LLM analysis if requested
        if (args.useLLM && rulesForFile.length > 0) {
          try {
            const prompt = buildLLMPrompt({ filePath: file.filename, addedLines, rules: rulesForFile });
            const llmResponse = await callLLM(prompt);
            const parsedFindings = parseLLMFindings(llmResponse, file.filename);
            
            // Map line numbers to diff positions
            parsedFindings.forEach((f) => {
              const idx = f.position - 1;
              if (addedWithPos[idx]) f.position = addedWithPos[idx].position;
            });
            
            if (parsedFindings.length > 0) {
              llmFindings.push(...parsedFindings);
              output.push(`  🤖 LLM found ${parsedFindings.length} findings`);
            }
          } catch (error) {
            output.push(`  ❌ LLM analysis failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      
      // Report findings
      const totalFindings = [...allFindings, ...llmFindings];
      if (totalFindings.length > 0) {
        output.push(`\n📝 **Found ${totalFindings.length} findings:**`);
        totalFindings.forEach((f, i) => {
          output.push(`${i + 1}. \`${f.path}\` @${f.position}: ${f.message} ${f.ruleId ? `(${f.ruleId})` : ''}`);
        });
        
        // Post comments
        if (!args.dryRun) {
          await postReviewComments({
            owner,
            repo,
            pullNumber: Number(prNumber),
            findings: totalFindings,
            dryRun: false,
          });
          output.push(`\n✅ **Posted ${totalFindings.length} review comments to GitHub**`);
        } else {
          output.push(`\n🔍 **Dry run mode - comments not posted**`);
          output.push(`Set \`dryRun: false\` to actually post comments to GitHub`);
        }
      } else {
        output.push('\n✅ **No issues found - code looks good!**');
      }
      
      return {
        content: [
          {
            type: 'text',
            text: output.join('\n'),
          },
        ],
      };
    }
    
    if (request.params.name === 'show_coding_rules') {
      const ruleLoader = new RuleLoader();
      const rules = ruleLoader.loadRules();
      
      let output = [`📋 **Loaded Coding Rules (${rules.length})**\n`];
      
      rules.forEach((rule, i) => {
        output.push(`**${i + 1}. ${rule.metadata.title}** (${rule.metadata.severity})`);
        output.push(`   Category: ${rule.metadata.category}`);
        output.push(`   File patterns: ${rule.metadata.filePatterns.join(', ')}`);
        output.push(`   ${rule.content.substring(0, 150)}...`);
        output.push('');
      });
      
      return {
        content: [
          {
            type: 'text',
            text: output.join('\n'),
          },
        ],
      };
    }
    
    throw new Error(`Unknown tool: ${request.params.name}`);
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ **Error:** ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Elementor Code Review MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
