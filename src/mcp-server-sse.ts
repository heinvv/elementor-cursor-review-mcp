#!/usr/bin/env node
import http from 'http';
import { z } from 'zod';
import { fetchPR, extractAddedLines, getAddedLinesWithPositions } from './github.js';
import { RuleLoader } from './rules.js';
import { buildLLMPrompt, parseLLMFindings } from './llm.js';
import { postReviewComments } from './post-comments.js';

// Schema for the review PR tool
const reviewPRSchema = z.object({
  prUrl: z.string().describe('GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)'),
  dryRun: z.boolean().optional().default(true).describe('Whether to do a dry run (true) or actually post comments (false)'),
  useLLM: z.boolean().optional().default(false).describe('Whether to use LLM analysis in addition to heuristics'),
});

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

// Simulate Cursor's LLM integration
async function callLLM(prompt: string): Promise<string> {
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
  
  return JSON.stringify(findings);
}

async function handleListTools() {
  return {
    jsonrpc: '2.0',
    result: {
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
    },
  };
}

async function handleCallTool(request: any) {
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
      output.push(`**Rules loaded:** ${rules.length}`);
      output.push('\n✅ **SSE server working!**');
      
      return {
        jsonrpc: '2.0',
        result: {
          content: [
            {
              type: 'text',
              text: output.join('\n'),
            },
          ],
        },
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
        jsonrpc: '2.0',
        result: {
          content: [
            {
              type: 'text',
              text: output.join('\n'),
            },
          ],
        },
      };
    }
    
    throw new Error(`Unknown tool: ${request.params.name}`);
  } catch (error) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

const server = http.createServer(async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/sse' && req.method === 'GET') {
    // SSE endpoint for MCP
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    
    // Send initial connection message
    res.write('data: {"jsonrpc":"2.0","method":"initialized"}\n\n');
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write('data: {"jsonrpc":"2.0","method":"ping"}\n\n');
    }, 30000);
    
    req.on('close', () => {
      clearInterval(keepAlive);
    });
    
    return;
  }
  
  if (req.url === '/mcp' && req.method === 'POST') {
    // JSON-RPC endpoint
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const request = JSON.parse(body);
        let response;
        
        if (request.method === 'tools/list') {
          response = await handleListTools();
        } else if (request.method === 'tools/call') {
          response = await handleCallTool(request);
        } else {
          response = {
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          };
        }
        
        response.id = request.id;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error',
          },
          id: null,
        };
        
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorResponse));
      }
    });
    
    return;
  }
  
  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', server: 'elementor-cursor-review-mcp' }));
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3333;

server.listen(PORT, () => {
  console.error(`Elementor Code Review MCP Server running on http://localhost:${PORT}`);
  console.error(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.error(`JSON-RPC endpoint: http://localhost:${PORT}/mcp`);
  console.error(`Health check: http://localhost:${PORT}/health`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
