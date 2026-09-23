import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "../src/app.js";
import { loadConfig, type Config } from "../src/config.js";

const config: Config = { ...loadConfig({}), publicDir: null };

describe("HTTP surface", () => {
  const app = createApp(config);

  it("GET /healthz returns 200", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /mcp is 405 in stateless mode", async () => {
    const res = await request(app).get("/mcp");
    expect(res.status).toBe(405);
    expect(res.headers.allow).toBe("POST");
  });

  it("says so at / when the console has not been built", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/console has not been built/);
  });

  it("serves the console at / once it exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "frank-public-"));
    writeFileSync(join(dir, "index.html"), "<title>console</title>");
    const res = await request(createApp({ ...config, publicDir: dir })).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>console</title>");
  });
});

describe("MCP over Streamable HTTP", () => {
  let server: Server;
  let client: Client;

  beforeAll(async () => {
    server = createApp(config).listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    client = new Client({ name: "frank-test", version: "0.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
  });

  afterAll(async () => {
    await client.close();
    await new Promise((resolve) => server.close(resolve));
  });

  it("lists get_status", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("get_status");
  });

  it("get_status returns a summary plus typed fields", async () => {
    const result = await client.callTool({ name: "get_status", arguments: {} });
    expect(result.isError).toBeFalsy();
    const out = result.structuredContent as Record<string, unknown>;
    expect(out.summary).toMatch(/^Frank /);
    expect(out.version).toBe(config.version);
    expect(typeof out.uptimeSeconds).toBe("number");
    expect(typeof out.greeting).toBe("string");
  });

  it("rejects unknown input fields", async () => {
    const result = await client.callTool({ name: "get_status", arguments: { surprise: true } });
    expect(result.isError).toBe(true);
  });
});

describe("config", () => {
  it("defaults PORT to 3000", () => {
    expect(loadConfig({}).port).toBe(3000);
  });

  it("fails at boot on a bad PORT, in plain language", () => {
    expect(() => loadConfig({ PORT: "not-a-port" })).toThrow(/configuration is invalid/);
  });
});
