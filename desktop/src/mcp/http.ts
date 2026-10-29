/**
 * The local MCP endpoint: Streamable HTTP on 127.0.0.1.
 *
 * One endpoint for every client. Claude Code, Codex and Cursor connect to it
 * directly; clients that only speak stdio (Claude Desktop) go through the
 * bundled bridge, which forwards to it. Either way a single engine — the one in
 * the app — owns the library, so there is never a second writer.
 *
 * Stateless: a fresh server per request, as the SDK recommends when no session
 * state is needed. Nothing here is slow to build.
 */
import http from 'http';
import crypto from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const MCP_PATH = '/mcp';

export interface McpHttpHandle {
  url: string;
  close(): Promise<void>;
}

function tokenMatches(header: string | undefined, token: string): boolean {
  const presented = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(presented);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function startMcpHttp(opts: {
  port: number;
  token: string;
  createServer: () => McpServer;
}): Promise<McpHttpHandle> {
  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');

    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
      return;
    }
    if (url.pathname !== MCP_PATH) {
      res.writeHead(404).end();
      return;
    }
    // Agents never send Origin; a browser tab always does. Refusing it closes the
    // DNS-rebinding route from a malicious page to this port.
    if (req.headers.origin) {
      res.writeHead(403).end('Browser requests are not accepted');
      return;
    }
    if (!tokenMatches(req.headers.authorization, opts.token)) {
      res.writeHead(401, { 'content-type': 'application/json' }).end(
        JSON.stringify({ error: 'Missing or wrong token. Copy the connection details again from the Momentreel app.' })
      );
      return;
    }

    const server = opts.createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error('[mcp] request failed:', err);
      if (!res.headersSent) res.writeHead(500).end();
    }
  });

  return new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(opts.port, '127.0.0.1', () => {
      httpServer.off('error', reject);
      resolve({
        url: `http://127.0.0.1:${opts.port}${MCP_PATH}`,
        close: () => new Promise((done) => httpServer.close(() => done())),
      });
    });
  });
}
