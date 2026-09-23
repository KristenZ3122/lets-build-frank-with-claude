import { describe, expect, it } from "vitest";
import { ALLOWED_VERBS, tools } from "../src/tools/index.js";

// ADR-002 is policy. These checks make it fail the build, not just a review.
describe.each(tools.map((t) => [t.name, t] as const))("tool %s", (name, tool) => {
  it("is verb_noun with a verb from the closed set", () => {
    expect(name).toMatch(/^[a-z]+(_[a-z]+)+$/);
    expect(ALLOWED_VERBS).toContain(name.split("_")[0]);
  });

  it("has a description written for a model", () => {
    expect(tool.description.length).toBeGreaterThan(20);
  });

  it("describes every input parameter", () => {
    for (const [param, schema] of Object.entries(tool.inputSchema.shape)) {
      expect((schema as { description?: string }).description, `${name}.${param}`).toBeTruthy();
    }
  });

  it("rejects unknown input fields", () => {
    expect(tool.inputSchema.safeParse({ __unknown__: 1 }).success).toBe(false);
  });

  it("returns a summary string", () => {
    expect(Object.keys(tool.outputSchema.shape)).toContain("summary");
  });
});

it("tool names are unique", () => {
  const names = tools.map((t) => t.name);
  expect(new Set(names).size).toBe(names.length);
});
