import { getStatus } from "./get_status.js";
import type { FrankTool } from "./types.js";

// Every tool Frank exposes. Register new tools here; test/conventions.test.ts
// checks each one against ADR-002.
export const tools: FrankTool[] = [getStatus];

/** ADR-002's closed verb set. Adding a verb takes a new ADR, not a PR. */
export const ALLOWED_VERBS = ["get", "list", "search", "summarize"] as const;
