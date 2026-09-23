import express, { type Express } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Config } from "./config.js";
import { createMcpServer } from "./mcp.js";

export function createApp(config: Config): Express {
  const app = express();
  app.disable("x-powered-by");

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", version: config.version });
  });

  // Stateless Streamable HTTP: a fresh server and transport per request, so
  // one Frank serves many clients with no session affinity (ADR-001).
  app.post("/mcp", express.json({ limit: "1mb" }), async (req, res) => {
    const server = createMcpServer(config);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP request failed:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Frank hit an internal error handling that request." },
          id: null,
        });
      }
    }
  });

  // Stateless mode has no server-initiated stream and no session to delete.
  app.all("/mcp", (_req, res) => {
    res.status(405).set("Allow", "POST").json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. Frank's MCP endpoint takes POST." },
      id: null,
    });
  });

  // The console is served by Frank at / (ADR-006), and is optional (ADR-003).
  if (config.publicDir) {
    app.use(express.static(config.publicDir));
  } else {
    app.get("/", (_req, res) => {
      res
        .type("text/plain")
        .send("Frank is running, but his console has not been built yet (ADR-003). MCP is at POST /mcp.\n");
    });
  }

  return app;
}
