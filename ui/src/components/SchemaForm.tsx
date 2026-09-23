import Box from "@cloudscape-design/components/box";
import Checkbox from "@cloudscape-design/components/checkbox";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import type { Field, FormValues } from "../schema";

interface Props {
  fields: Field[];
  values: FormValues;
  errors: Record<string, string>;
  onChange(name: string, value: string | boolean): void;
}

export function SchemaForm({ fields, values, errors, onChange }: Props) {
  if (fields.length === 0) {
    return <Box color="text-body-secondary">This tool takes no parameters.</Box>;
  }

  return (
    <SpaceBetween size="m">
      {fields.map((field) => (
        <FormField
          key={field.name}
          label={field.name}
          description={field.description}
          info={field.required ? undefined : <i>optional</i>}
          errorText={errors[field.name]}
        >
          <FieldInput field={field} value={values[field.name]} onChange={(v) => onChange(field.name, v)} />
        </FormField>
      ))}
    </SpaceBetween>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string | boolean | undefined;
  onChange(value: string | boolean): void;
}) {
  const text = typeof value === "string" ? value : "";

  switch (field.kind) {
    case "boolean":
      return (
        <Checkbox checked={value === true} onChange={({ detail }) => onChange(detail.checked)}>
          {field.name}
        </Checkbox>
      );
    case "enum": {
      const options = (field.options ?? []).map((o) => ({ label: o, value: o }));
      return (
        <Select
          selectedOption={options.find((o) => o.value === text) ?? null}
          options={options}
          placeholder="Choose a value"
          onChange={({ detail }) => onChange(detail.selectedOption.value ?? "")}
        />
      );
    }
    case "json":
      return <Textarea value={text} placeholder="JSON" onChange={({ detail }) => onChange(detail.value)} />;
    default:
      return (
        <Input
          value={text}
          type={field.kind === "string" ? "text" : "number"}
          ariaLabel={field.name}
          onChange={({ detail }) => onChange(detail.value)}
        />
      );
  }
}
