#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'
import { createServer } from './mcp.js'
import { startHttpServer } from './server.js'

loadEnv({ path: resolve(process.cwd(), '.env') })

export async function startServer(): Promise<void> {
  const isStdioMode = process.env.NODE_ENV === 'cli' || process.argv.includes('--stdio')
  const server = createServer()

  if (isStdioMode) {
    const transport = new StdioServerTransport()
    await server.connect(transport)
  } else {
    const port = Number(process.env.PORT || 3335)
    await startHttpServer(port, server)
  }
}

if (process.argv[1]) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}


