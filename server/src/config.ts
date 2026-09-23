import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// All settings come from environment variables (ADR-001). Later ADRs add
// their own keys here; nothing is read from a config file.
const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export interface Config {
  port: number;
  version: string;
  /** The built console, or null when it has not been built yet (ADR-003). */
  publicDir: string | null;
}

// src/ in dev, dist/ in the image: either way the package root is one level up.
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readVersion(): string {
  const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as { version?: string };
  return pkg.version ?? "0.0.0";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    // Fail at boot, not at first request, with a message a person can act on.
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Frank's configuration is invalid: ${problems}`);
  }
  const publicDir = join(packageRoot, "public");
  return {
    port: parsed.data.PORT,
    version: readVersion(),
    publicDir: existsSync(join(publicDir, "index.html")) ? publicDir : null,
  };
}
