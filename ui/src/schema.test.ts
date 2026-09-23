import { describe, expect, it } from "vitest";
import { buildArguments, fieldsFromSchema } from "./schema";

const schema = {
  type: "object",
  properties: {
    name: { type: "string", description: "Who to look up." },
    limit: { type: "integer" },
    ratio: { type: "number" },
    verbose: { type: "boolean" },
    region: { type: "string", enum: ["eastus", "westus"] },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["name"],
  additionalProperties: false,
};

describe("fieldsFromSchema", () => {
  it("maps JSON Schema properties to form fields", () => {
    const fields = fieldsFromSchema(schema);
    expect(fields.map((f) => [f.name, f.kind, f.required])).toEqual([
      ["name", "string", true],
      ["limit", "integer", false],
      ["ratio", "number", false],
      ["verbose", "boolean", false],
      ["region", "enum", false],
      ["tags", "json", false],
    ]);
    expect(fields[0].description).toBe("Who to look up.");
    expect(fields[4].options).toEqual(["eastus", "westus"]);
  });

  it("handles a tool with no parameters", () => {
    expect(fieldsFromSchema({ type: "object", properties: {} })).toEqual([]);
    expect(fieldsFromSchema(undefined)).toEqual([]);
  });
});

describe("buildArguments", () => {
  const fields = fieldsFromSchema(schema);

  it("converts form values to typed arguments and omits blanks", () => {
    const result = buildArguments(fields, {
      name: " frank ",
      limit: "5",
      ratio: "",
      verbose: true,
      tags: '["a","b"]',
    });
    expect(result).toEqual({ ok: true, args: { name: "frank", limit: 5, verbose: true, tags: ["a", "b"] } });
  });

  it("reports required, numeric and JSON errors per field", () => {
    const result = buildArguments(fields, { limit: "2.5", ratio: "abc", tags: "[oops" });
    expect(result).toEqual({
      ok: false,
      errors: {
        name: "Required.",
        limit: "Enter a whole number.",
        ratio: "Enter a number.",
        tags: "Enter valid JSON.",
      },
    });
  });
});
