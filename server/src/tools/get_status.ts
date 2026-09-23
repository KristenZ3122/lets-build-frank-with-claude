import { z } from "zod";
import { defineTool } from "./types.js";

export const getStatus = defineTool({
  name: "get_status",
  title: "Get Frank's status",
  description:
    "Returns Frank's version, how long he has been running, and a greeting. Use it to check that Frank is reachable; it says nothing about Azure.",
  inputSchema: z.object({}).strict(),
  outputSchema: z.object({
    summary: z.string(),
    version: z.string().describe("Frank's package version."),
    uptimeSeconds: z.number().describe("Seconds since this Frank process started."),
    greeting: z.string(),
  }),
  async run(_input, { config }) {
    const uptimeSeconds = Math.round(process.uptime());
    return {
      summary: `Frank ${config.version} has been up for ${formatUptime(uptimeSeconds)}.`,
      version: config.version,
      uptimeSeconds,
      greeting: "Hi, I'm Frank. I can look, but I don't touch.",
    };
  },
});

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
