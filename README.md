# Elementor Code Review MCP

A Model Context Protocol (MCP) server that provides code review capabilities for GitHub pull requests using Elementor's coding guidelines. This tool integrates with Cursor IDE to analyze PRs and suggest improvements based on predefined rules.

## Features

- ✅ Fetch and analyze GitHub pull request content
- ✅ Apply coding rules based on file types (JS, TS, PHP, etc.)
- ✅ LLM-powered code analysis using configurable rules
- ✅ Generate review comments with line-specific feedback
- ✅ Post comments directly to GitHub PRs (optional)
- ✅ Support for both stdio and HTTP SSE transports

## Quick Setup for Cursor

### 1. Install Dependencies
```bash
cd /Users/janvanvlastuin1981/Local\ Sites/elementor/app/public/wp-content/elementor-cursor-review-mcp
npm install
```

### 2. Set Your GitHub Token
Create a `.env` file:
```bash
cp env.example .env
# Edit .env and add your GitHub token:
GITHUB_TOKEN=ghp_your_actual_token_here
```

### 3. Build the Project
```bash
npm run build
```

### 4. Add to Cursor MCP Configuration

**Option A: Stdio Transport (Recommended)**

Add to your `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "elementor-code-review": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/janvanvlastuin1981/Local Sites/elementor/app/public/wp-content/elementor-cursor-review-mcp/dist/mcp-server.js"
      ],
      "cwd": "/Users/janvanvlastuin1981/Local Sites/elementor/app/public/wp-content/elementor-cursor-review-mcp",
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

**Option B: HTTP SSE Transport**

1. Start the SSE server:
```bash
GITHUB_TOKEN="your_token" npm run mcp:sse
```

2. Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "elementor-code-review-sse": {
      "url": "http://localhost:3333/sse"
    }
  }
}
```

### 5. Restart Cursor
Restart Cursor completely to load the new MCP server.

## Usage in Cursor Chat

### Review a Pull Request
```
Can you review this PR using our coding guidelines?
PR: https://github.com/elementor/hello-commerce/pull/203
```

The MCP will:
- ✅ Fetch PR content and file changes
- ✅ Apply coding rules based on file types
- ✅ Analyze code using LLM (simulated)
- ✅ Show findings with line numbers
- ✅ Optionally post comments to GitHub (with dryRun: false)

### Show Available Rules
```
What coding rules are available?
```

### Advanced Usage
```
Review this PR and actually post the comments:
PR: https://github.com/elementor/hello-commerce/pull/203
Use LLM analysis: true
Dry run: false
```

## Available Tools

### `review_pull_request`
- **prUrl** (required): GitHub PR URL (e.g., `https://github.com/owner/repo/pull/123`)
- **dryRun** (optional, default: true): Whether to post comments to GitHub
- **useLLM** (optional, default: false): Use LLM analysis in addition to heuristics

### `show_coding_rules`
- Shows all loaded coding rules from the `rules/` directory

## Coding Rules

Add your `.md` rule files to the `./rules/` directory. Each rule file should have YAML frontmatter with metadata and Markdown content for the rule description.

### Current Rules
- `avoid-todo.md` - Avoid TODO comments, create tickets instead
- `descriptive-naming.md` - Use clear, descriptive names for variables and functions
- `general-quality.md` - General code quality and best practices

### Rule File Format
```markdown
---
title: "Rule Title"
severity: "warning"  # error, warning, info
category: "naming"    # naming, structure, performance, etc.
filePatterns: ["*.ts", "*.js", "*.php"]
examples:
  - bad: "const x = getData();"
    good: "const userData = getUserData();"
---

Your rule description in Markdown format...
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run mcp` - Start stdio MCP server
- `npm run mcp:sse` - Start HTTP SSE MCP server on port 3333
- `npm run dev` - Run CLI version for testing

## Troubleshooting

### MCP Server Not Starting
1. **Check Node.js path**: Ensure `/opt/homebrew/bin/node` exists or update path in config
2. **Check dependencies**: Run `npm install`
3. **Check GitHub token**: Verify token in `.env` file or environment variables
4. **Check Cursor logs**: Open Cursor Developer Tools for MCP connection logs

### "No tools or prompts" in Cursor
1. **Restart Cursor completely** (known issue with MCP detection)
2. **Try SSE transport** if stdio fails
3. **Clear npm cache**: `rm -rf ~/.npm/_npx && rm -rf node_modules && npm install`
4. **Check server startup**: Run `npm run mcp` manually to see error messages

### No Rules Loading
1. Ensure `rules/` directory exists with `.md` files
2. Check rule file format (YAML frontmatter + Markdown content)
3. Verify file patterns match your target files

### GitHub API Issues
1. **Token scope**: Verify your GitHub token has `repo` scope
2. **Private repos**: Ensure token has access to target repositories
3. **Rate limits**: Check GitHub API response headers for rate limit status
4. **Network**: Verify connectivity to `api.github.com`

## Development

### Test the MCP Server Directly
```bash
# Test CLI version
npm run dev https://github.com/elementor/hello-commerce/pull/203

# Test stdio MCP server
npm run mcp

# Test SSE server
npm run mcp:sse
curl http://localhost:3333/health
```

### Manual API Testing
```bash
# Test tools list
curl -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Test tool call
curl -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "id":1,
    "params":{
      "name":"show_coding_rules",
      "arguments":{}
    }
  }'
```

## Project Structure

```
elementor-cursor-review-mcp/
├── src/
│   ├── mcp-server.ts        # Stdio MCP server
│   ├── mcp-server-sse.ts    # HTTP SSE MCP server
│   ├── github.ts            # GitHub API integration
│   ├── rules.ts             # Rule loading and matching
│   ├── analyze.ts           # Heuristic code analysis
│   ├── llm.ts               # LLM prompt building
│   ├── post-comments.ts     # GitHub comment posting
│   └── types.ts             # TypeScript type definitions
├── rules/                   # Coding rule definitions
├── dist/                    # Compiled JavaScript output
└── README.md               # This file
```

## Known Issues

- Cursor v1.3+ may have MCP detection issues - try restarting or using SSE transport
- Some GitHub Enterprise setups may require additional authentication
- Large PRs may hit GitHub API rate limits

## Contributing

1. Add new rules to the `rules/` directory
2. Test with `npm run dev <pr-url>`
3. Update rule patterns and examples
4. Submit PRs with rule improvements

## License

This project is part of the Elementor development toolchain.