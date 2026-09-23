import type { z } from "zod";
import type { Config } from "../config.js";

/** Everything a tool may read. Tools get facts, never handles that can write (ADR-002). */
export interface ToolContext {
  config: Config;
}

/** ADR-002's output shape: a readable summary plus typed detail fields. */
export type ToolOutput = { summary: string; [field: string]: unknown };

export interface FrankTool {
  /** verb_noun, with the verb from ADR-002's closed set. */
  name: string;
  title: string;
  /** Written for a model deciding whether to call the tool. */
  description: string;
  /** Must be a strict object: unknown fields are rejected (ADR-002). */
  inputSchema: z.ZodObject;
  outputSchema: z.ZodObject;
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutput>;
}

/** Declares a tool with its input typed from its schema. */
export function defineTool<In extends z.ZodObject, Out extends z.ZodObject>(tool: {
  name: string;
  title: string;
  description: string;
  inputSchema: In;
  outputSchema: Out;
  run(input: z.infer<In>, ctx: ToolContext): Promise<z.infer<Out> & ToolOutput>;
}): FrankTool {
  return tool as unknown as FrankTool;
}
