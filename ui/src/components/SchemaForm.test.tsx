import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SchemaForm } from "./SchemaForm";
import type { Field } from "../schema";

afterEach(cleanup);

describe("SchemaForm", () => {
  it("says so when a tool takes no parameters", () => {
    render(<SchemaForm fields={[]} values={{}} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByText("This tool takes no parameters.")).toBeTruthy();
  });

  it("renders a labelled field per parameter, with its error", () => {
    const fields: Field[] = [
      { name: "resource_group", kind: "string", required: true, description: "Which group." },
      { name: "verbose", kind: "boolean", required: false },
    ];
    render(
      <SchemaForm fields={fields} values={{}} errors={{ resource_group: "Required." }} onChange={vi.fn()} />,
    );
    expect(screen.getByText("Which group.")).toBeTruthy();
    expect(screen.getByText("Required.")).toBeTruthy();
    expect(screen.getAllByText("verbose").length).toBeGreaterThan(0);
  });
});
