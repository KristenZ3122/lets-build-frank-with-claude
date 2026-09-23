import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Config } from "./config.js";
import { tools } from "./tools/index.js";

export function createMcpServer(config: Config): McpServer {
  const server = new McpServer({ name: "frank", version: config.version });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: { readOnlyHint: true, destructiveHint: false },
      },
      async (args: Record<string, unknown>): Promise<CallToolResult> => {
        try {
          const result = await tool.run(args, { config });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
          };
        } catch (err) {
          // Plain language, never a stack trace (ADR-002). The detail goes to the log.
          console.error(`tool ${tool.name} failed:`, err);
          const reason = err instanceof Error ? err.message : "an unexpected error";
          return {
            isError: true,
            content: [{ type: "text", text: `${tool.name} could not complete: ${reason}` }],
          };
        }
      },
    );
  }

  return server;
}
