### Elementor Code Review MCP: Protocols and Transports (2025-08-13)

This project now uses the latest Model Context Protocol SDK and recommended transports. The old bespoke SSE handler and legacy stdio implementation were removed and replaced with the official SDK primitives and endpoints.

- SDK: `@modelcontextprotocol/sdk@^1.10.2`
- Server core: `McpServer` with `server.tool(...)`
- Transports:
  - Streamable HTTP: POST/GET/DELETE ` /mcp ` via `StreamableHTTPServerTransport`
  - SSE: GET ` /sse ` and POST ` /messages?sessionId=... ` via `SSEServerTransport`

Files:
- `src/mcp.ts`: constructs the `McpServer`, registers tools
- `src/server.ts`: Express server wiring for both transports
- `src/cli.ts`: runs in stdio mode (`--stdio` or `NODE_ENV=cli`) or HTTP mode (default)

HTTP mode:
- Start: `PORT=3335 npm run start:http`
- Endpoints:
  - Health: `GET /health`
  - Streamable HTTP: `POST /mcp` (init and requests), `GET /mcp`, `DELETE /mcp`
  - SSE: `GET /sse` (event stream), `POST /messages?sessionId=...` (client → server messages)

Cursor configuration examples:
- SSE transport:
```json
{
  "mcpServers": {
    "elementor-code-review": {
      "url": "http://localhost:3335/sse"
    }
  }
}
```
- Streamable HTTP transport:
```json
{
  "mcpServers": {
    "elementor-code-review": {
      "url": "http://localhost:3335/mcp"
    }
  }
}
```
- Stdio transport:
```json
{
  "mcpServers": {
    "elementor-code-review": {
      "command": "npm",
      "args": ["run", "start:cli"],
      "cwd": "/Users/janvanvlastuin1981/Local Sites/elementor/app/public/wp-content/elementor-cursor-review-mcp"
    }
  }
}
```

Notes:
- Only `/mcp` is JSON-parsed; SSE endpoints must not use global body parsers.
- Session lifecycle for Streamable HTTP is handled by the SDK using `mcp-session-id`.
- SSE uses SDK-generated session IDs; all client POSTs go to `/messages` with `sessionId` query.
- Keep Node 18+.


