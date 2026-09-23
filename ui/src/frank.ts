import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

export type { CallToolResult, Tool };

// Relative to wherever this page was served from: Frank serves the console,
// so Frank is always on the same origin (ADR-006). No URL, no CORS, no secrets.
const MCP_URL = new URL("/mcp", window.location.href);

let connecting: Promise<Client> | null = null;

function client(): Promise<Client> {
  if (!connecting) {
    const c = new Client({ name: "frank-console", version: "0.1.0" });
    connecting = c
      .connect(new StreamableHTTPClientTransport(MCP_URL))
      .then(() => c)
      .catch((err: unknown) => {
        connecting = null; // let the next call retry
        throw err;
      });
  }
  return connecting;
}

export async function listTools(): Promise<Tool[]> {
  return (await (await client()).listTools()).tools;
}

export async function callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  return (await (await client()).callTool({ name, arguments: args })) as CallToolResult;
}

export async function checkHealth(): Promise<boolean> {
  try {
    return (await fetch(new URL("/healthz", window.location.href))).ok;
  } catch {
    return false;
  }
}

/** A human-readable message from whatever a failed call threw. */
export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
