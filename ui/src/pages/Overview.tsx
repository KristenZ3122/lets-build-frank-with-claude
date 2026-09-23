import { useCallback, useEffect, useState } from "react";
import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { callTool, checkHealth, describeError } from "../frank";

interface Status {
  summary: string;
  version: string;
  uptimeSeconds: number;
  greeting: string;
}

type State =
  | { phase: "loading" }
  | { phase: "ok"; status: Status; healthy: boolean }
  | { phase: "error"; message: string; healthy: boolean };

export function Overview() {
  const [state, setState] = useState<State>({ phase: "loading" });

  const refresh = useCallback(async () => {
    setState({ phase: "loading" });
    const healthy = await checkHealth();
    try {
      const result = await callTool("get_status", {});
      if (result.isError) throw new Error(textOf(result.content) || "get_status failed.");
      setState({ phase: "ok", status: result.structuredContent as unknown as Status, healthy });
    } catch (err) {
      setState({ phase: "error", message: describeError(err), healthy });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Frank's status, from his own get_status tool."
          actions={
            <Button iconName="refresh" loading={state.phase === "loading"} onClick={() => void refresh()}>
              Refresh
            </Button>
          }
        >
          Overview
        </Header>
      }
    >
      <SpaceBetween size="l">
        {state.phase === "ok" && <Alert type="info">{state.status.greeting}</Alert>}
        {state.phase === "error" && (
          <Alert type="error" header="Could not reach Frank over MCP">
            {state.message}
          </Alert>
        )}
        <Container header={<Header variant="h2">Status</Header>}>
          <KeyValuePairs
            columns={4}
            items={[
              { label: "Connection", value: <Connection state={state} /> },
              { label: "Version", value: state.phase === "ok" ? state.status.version : "-" },
              { label: "Uptime", value: state.phase === "ok" ? state.status.summary : "-" },
              {
                label: "Health check",
                value:
                  state.phase === "loading" ? (
                    <StatusIndicator type="loading">Checking</StatusIndicator>
                  ) : state.healthy ? (
                    <StatusIndicator type="success">/healthz OK</StatusIndicator>
                  ) : (
                    <StatusIndicator type="error">/healthz failing</StatusIndicator>
                  ),
              },
            ]}
          />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}

function Connection({ state }: { state: State }) {
  if (state.phase === "loading") return <StatusIndicator type="loading">Connecting</StatusIndicator>;
  if (state.phase === "ok") return <StatusIndicator type="success">Connected</StatusIndicator>;
  return <StatusIndicator type="error">Not connected</StatusIndicator>;
}

function textOf(content: unknown): string {
  return Array.isArray(content)
    ? content.map((c: { type?: string; text?: string }) => (c.type === "text" ? c.text : "")).join("\n")
    : "";
}
