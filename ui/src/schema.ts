// Turns a tool's JSON Schema (from MCP discovery) into form fields and back
// into call arguments. This is ADR-003's "new tools appear in the UI with zero
// UI work": nothing here knows about any particular tool.

export type FieldKind = "string" | "number" | "integer" | "boolean" | "enum" | "json";

export interface Field {
  name: string;
  kind: FieldKind;
  required: boolean;
  description?: string;
  options?: string[];
}

/** Form state: text inputs hold strings, checkboxes hold booleans. */
export type FormValues = Record<string, string | boolean>;

interface JsonSchemaProperty {
  type?: string | string[];
  enum?: unknown[];
  description?: string;
}

interface JsonObjectSchema {
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export function fieldsFromSchema(schema: unknown): Field[] {
  const { properties = {}, required = [] } = (schema ?? {}) as JsonObjectSchema;
  return Object.entries(properties).map(([name, prop]) => ({
    name,
    kind: kindOf(prop),
    required: required.includes(name),
    description: prop.description,
    options: prop.enum?.map(String),
  }));
}

function kindOf(prop: JsonSchemaProperty): FieldKind {
  if (prop.enum) return "enum";
  const type = Array.isArray(prop.type) ? prop.type.find((t) => t !== "null") : prop.type;
  switch (type) {
    case "string":
    case "number":
    case "integer":
    case "boolean":
      return type;
    default:
      return "json"; // objects, arrays, anything else: edit as JSON
  }
}

export type BuildResult =
  | { ok: true; args: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

export function buildArguments(fields: Field[], values: FormValues): BuildResult {
  const args: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const raw = values[field.name];

    if (field.kind === "boolean") {
      if (raw !== undefined) args[field.name] = raw === true;
      continue;
    }

    const text = typeof raw === "string" ? raw.trim() : "";
    if (text === "") {
      if (field.required) errors[field.name] = "Required.";
      continue;
    }

    switch (field.kind) {
      case "number":
      case "integer": {
        const n = Number(text);
        if (!Number.isFinite(n) || (field.kind === "integer" && !Number.isInteger(n))) {
          errors[field.name] = field.kind === "integer" ? "Enter a whole number." : "Enter a number.";
        } else {
          args[field.name] = n;
        }
        break;
      }
      case "json":
        try {
          args[field.name] = JSON.parse(text);
        } catch {
          errors[field.name] = "Enter valid JSON.";
        }
        break;
      default:
        args[field.name] = text;
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, args };
}
