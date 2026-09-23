import { useEffect, useMemo, useState } from "react";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { SchemaForm } from "../components/SchemaForm";
import { callTool, describeError, listTools, type CallToolResult, type Tool } from "../frank";
import { buildArguments, fieldsFromSchema, type FormValues } from "../schema";

export function Tools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Tool | null>(null);

  useEffect(() => {
    listTools()
      .then((list) => {
        setTools(list);
        setSelected((current) => current ?? list[0] ?? null);
      })
      .catch((err) => setLoadError(describeError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SpaceBetween size="l">
      {loadError && (
        <Alert type="error" header="Could not list Frank's tools">
          {loadError}
        </Alert>
      )}
      <Table
        header={
          <Header variant="h1" counter={loading ? undefined : `(${tools.length})`} description="Discovered over MCP.">
            Tools
          </Header>
        }
        items={tools}
        loading={loading}
        loadingText="Asking Frank what he can do"
        trackBy="name"
        selectionType="single"
        selectedItems={selected ? [selected] : []}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems[0] ?? null)}
        columnDefinitions={[
          { id: "name", header: "Name", cell: (t) => <Box variant="code">{t.name}</Box>, width: 240 },
          { id: "description", header: "Description", cell: (t) => t.description ?? "" },
        ]}
        empty={<Box textAlign="center">Frank reports no tools.</Box>}
      />
      {selected && <ToolRunner key={selected.name} tool={selected} />}
    </SpaceBetween>
  );
}

function ToolRunner({ tool }: { tool: Tool }) {
  const fields = useMemo(() => fieldsFromSchema(tool.inputSchema), [tool]);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CallToolResult | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  async function run() {
    const built = buildArguments(fields, values);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setErrors({});
    setRunning(true);
    setCallError(null);
    try {
      setResult(await callTool(tool.name, built.args));
    } catch (err) {
      setResult(null);
      setCallError(describeError(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <SpaceBetween size="l">
      <form onSubmit={(e) => (e.preventDefault(), void run())}>
        <Form
          actions={
            <Button variant="primary" loading={running} formAction="submit">
              Call {tool.name}
            </Button>
          }
        >
          <Container header={<Header variant="h2">{tool.title ?? tool.name}</Header>}>
            <SchemaForm
              fields={fields}
              values={values}
              errors={errors}
              onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
            />
          </Container>
        </Form>
      </form>
      {callError && (
        <Alert type="error" header={`Calling ${tool.name} failed`}>
          {callError}
        </Alert>
      )}
      {result && (
        <Container
          header={
            <Header variant="h2" description={result.isError ? "Frank reported an error." : undefined}>
              Result
            </Header>
          }
        >
          <Box variant="code">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(result.structuredContent ?? result.content, null, 2)}
            </pre>
          </Box>
        </Container>
      )}
    </SpaceBetween>
  );
}
