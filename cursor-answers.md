Targeted questions to pinpoint the blocker
Cursor config
Can you paste your actual Cursor MCP config (the one Cursor is using), redacting secrets?

    "elementor-code-review-sse": {
      "url": "http://localhost:3335/sse"
    },

Are you pointing Cursor to stdio (command/args) or to HTTP (SSE or Streamable HTTP)? Which exact fields are set (url, sseUrl, messageUrl, headers, etc.)?
Is the server name unique (no collisions with other MCPs using the same key)?

Unique

Connection attempts
When Cursor shows “Loading tools,” do you see any incoming requests in your elementor server logs? Which endpoints are hit: GET /sse, POST /messages, POST /mcp?

I am not seeing anything in the terminal.

If you tail logs, do you ever see an initialize request, or only connection open and pings?
Quick probes
From a terminal, what do you get for: curl -i -N http://localhost:3335/sse (does the event stream open)?

Do you see any POSTs to /messages in your server when opening Cursor? If not, Cursor likely isn’t using your SSE server.
Can you try the MCP Inspector against your server? For HTTP: pnpx @modelcontextprotocol/inspector and connect to your /mcp or SSE endpoints. What errors do you get?
Versions and environment
Which Cursor app version are you on?
Node.js version running the server?
Is anything else listening on 3335 or interfering (proxy, VPN, firewall)?
Working Figma servers
Are the working Figma servers configured in Cursor as stdio or HTTP? Can you share their working Cursor config section(s)?
Which ports/URLs do those use?
Server behavior
In elementor SSE, have you seen any “Method not found” or “Unknown message ID” errors in the logs during Cursor connection?
Did you ever see a server-side “initialize” request from Cursor? If not, it’s a transport mismatch.
Token and env
Your mcp-config.json includes a placeholder GITHUB_TOKEN. Did you set this in your real config or environment? (Tools should still list without it, but good to confirm.)
Likely fixes (minimal and reliable)
Align with the SDK and transports used by the working Figma servers:
Upgrade elementor MCP to @modelcontextprotocol/sdk@^1.10.2.
Switch to McpServer and server.tool(...) registrations.
Replace the custom SSE with the SDK transports:
SSE: GET /sse using new SSEServerTransport("/messages", res) and POST /messages.
Optional Streamable HTTP: POST/GET/DELETE /mcp using StreamableHTTPServerTransport.
Ensure Cursor config matches the chosen transport:
For SSE: configure Cursor with sseUrl and messageUrl that match your server.
For Streamable HTTP: configure url to /mcp.
Or use stdio reliably via npm run mcp after migrating to the new SDK/API.
Verify with MCP Inspector first; then open Cursor and confirm tools load.
If you share your Cursor MCP config and a short server log from a fresh Cursor connection attempt, I can tell you exactly where it’s failing and give a concrete edit plan.
Differences found: old SDK (^0.4.0), custom/manual SSE without /messages and no MCP initialize/session, and config pointing to stdio while you’re running HTTP. These are sufficient to cause “Loading tools”.
Next step: share Cursor MCP config + a connection log (which endpoints Cursor hits). I’ll map that to a minimal change set (SDK bump + endpoint/transport alignment) so tools load.
