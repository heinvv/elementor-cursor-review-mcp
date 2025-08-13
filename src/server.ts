import { randomUUID } from 'node:crypto'
import express, { type Request, type Response } from 'express'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import type { Server } from 'http'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

let httpServer: Server | null = null
const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>,
  sse: {} as Record<string, SSEServerTransport>,
}

export async function startHttpServer(port: number, mcpServer: McpServer): Promise<void> {
  const app = express()

  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', ts: new Date().toISOString() })
  })

  app.use('/mcp', express.json())

  app.post('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    let transport: StreamableHTTPServerTransport

    if (sessionId && transports.streamable[sessionId]) {
      transport = transports.streamable[sessionId]
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.streamable[sid] = transport
        },
      })
      transport.onclose = () => {
        if (transport.sessionId) delete transports.streamable[transport.sessionId]
      }
      await mcpServer.connect(transport)
    } else {
      res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session ID provided' }, id: null })
      return
    }

    await transport.handleRequest(req, res, req.body)
  })

  const handleSessionRequest = async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (!sessionId || !transports.streamable[sessionId]) {
      res.status(400).send('Invalid or missing session ID')
      return
    }
    try {
      const transport = transports.streamable[sessionId]
      await transport.handleRequest(req, res)
    } catch (error) {
      if (!res.headersSent) res.status(500).send('Error processing session termination')
    }
  }

  app.get('/mcp', handleSessionRequest)
  app.delete('/mcp', handleSessionRequest)

  app.get('/sse', async (req: Request, res: Response) => {
    const transport = new SSEServerTransport('/messages', res)
    transports.sse[transport.sessionId] = transport
    res.on('close', () => {
      delete transports.sse[transport.sessionId]
    })
    await mcpServer.connect(transport)
  })

  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string
    const transport = transports.sse[sessionId]
    if (!transport) {
      res.status(400).send(`No transport found for sessionId ${sessionId}`)
      return
    }
    await transport.handlePostMessage(req, res)
  })

  httpServer = app.listen(port, () => {
    console.error(`HTTP server listening on http://localhost:${port}`)
    console.error(`SSE endpoint: http://localhost:${port}/sse`)
    console.error(`Messages endpoint: http://localhost:${port}/messages`)
    console.error(`StreamableHTTP endpoint: http://localhost:${port}/mcp`)
  })
}

export async function stopHttpServer(): Promise<void> {
  if (!httpServer) return
  await new Promise<void>((resolve, reject) => {
    httpServer!.close((err: Error | undefined) => {
      if (err) reject(err)
      else resolve()
    })
  })
  httpServer = null
  for (const t of Object.values(transports.sse)) await t.close()
  for (const t of Object.values(transports.streamable)) await t.close()
}


