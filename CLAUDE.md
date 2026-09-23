# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The classroom repo for "Let's Build Frank". Frank is an MCP server with a Cloudscape web console, deployed as **one container** to Azure Container Apps. `server/` and `ui/` start empty on purpose and are built from the ADRs in `docs/adr/`. **The ADRs are the spec.** Read the relevant ones before writing code, and when asked to "implement ADR-NNN", follow it literally.

Where the ADRs and `README.md` disagree on status, trust the ADR file itself. Superseded ADRs say exactly which clauses were replaced; the surviving clauses still apply.

## Commands

`server/` and `ui/` are each a self-contained npm package (Node 22+), with the same scripts in both:

```bash
npm ci
npm run dev      # local dev
npm test         # the test gate: CI and the Docker build both run it
npm run build
```

Console dev: run Frank (`cd server && npm run dev`, :3000), then `cd ui && npm run dev`. Vite proxies `/mcp` and `/healthz` to :3000. To run Frank serving the built console without Docker, copy `ui/dist` to `server/public` (gitignored).

Single test: `npx vitest run test/app.test.ts -t "get_status"` (the same form works in `ui/`).

Full image locally (build context is the repo root, not `server/`):

```bash
docker build -t frank . && docker run -p 3000:3000 frank
curl localhost:3000/healthz
```

## Architecture (from ADR-001/002/003/006/010)

- **Server** (`server/`): TypeScript and Express, with the official `@modelcontextprotocol/sdk` over **Streamable HTTP**. Routes:
  - `POST /mcp`: MCP. It is **unauthenticated by design** (ADR-007 was rejected).
  - `GET /healthz`: returns 200.
  - `/`: the built console, served statically from `<package root>/public`.

  All config comes from env vars, validated in `server/src/config.ts`, and bad config fails at boot. `PORT` defaults to 3000. That value must match the Dockerfile's `ENV PORT` and deploy.yml's `--target-port`.
- **Tools**: one module per tool in `server/src/tools/`, registered in `server/src/tools/index.ts`, with tests in `server/test/`. Tool rules are policy (ADR-002; see the `frank-tools` skill):
  - Names are `verb_noun`, and the verb must be one of `get`, `list`, `search`, `summarize`.
  - Inputs use zod schemas that reject unknown fields.
  - Output has a top-level `summary` string plus typed fields.
  - Errors are `isError: true` with a plain-language message, never a stack trace.
  - **Read-only.** No tool mutates Azure, GitHub, or the filesystem (beyond temp space). A write tool needs a new ADR, not a PR.
  - The first tool is `get_status`: version, uptime, and a greeting.
- **Console** (`ui/`): React 18, Vite and TypeScript, using only Cloudscape components, with no custom CSS beyond layout.
  - Two pages. *Overview* shows `get_status`. *Tools* lists discovered tools and renders a form from each tool's input schema.
  - It calls `/mcp` **relatively**. There is no `VITE_FRANK_URL` and no CORS, because it is served by Frank from the same origin.
  - The console is optional. The Dockerfile tolerates an empty `ui/`, and the server must say "no console yet" at `/` rather than fail.
- **Azure access** (ADR-009, written in class): Frank reads Azure through `DefaultAzureCredential`. The pipeline injects `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` and `AZURE_RESOURCE_GROUP`. The resource group scope comes **only from the environment**, never from a tool parameter, so a caller cannot redirect Frank to another group.

## Build and deploy pipeline

- `Dockerfile` (root, multi-stage): builds `ui/` into `/app/public` if `ui/package.json` exists, and builds `server/` into `/app/dist`. **Both stages run `npm test`**, so on `main` the image build is the test gate. The container runs as `node` with `CMD node dist/index.js`.
- `.github/workflows/deploy.yml`:
  - **On PRs**, it builds and tests `server/` and `ui/` separately, only once each has a committed `package-lock.json`.
  - **On pushes to `main`**, it deploys. It fetches the shared classroom credential from `CREDENTIAL_URL` (ADR-010), runs `az acr build`, then `az containerapp create`/`update` in `rg-frank-class`.
  - The app is named `frank-<github-owner>`.
  - It deliberately avoids `az containerapp up --source` (a CLI crash), OIDC, and `environment: production`. The file explains why; don't reintroduce them.
- **Commit `package-lock.json`** for both packages. The Dockerfile uses `npm ci`, and CI skips any package that has no lockfile.
- `main` is branch-protected on this fork and requires a PR. Merging to `main` deploys to Azure.

## Repo workflows (`.claude/`)

- `/adr <title>`: drafts the next ADR from `docs/adr/template.md`, updates the tables in **both** `docs/adr/README.md` and `README.md`, and runs `adr-reviewer`. Accepted ADRs are never edited; they are superseded by a new ADR. Keep ADRs to about one page (roughly 300 words), leaving code-level detail to the code.
- Use these read-only subagents explicitly, by name:
  - `adr-reviewer` for any drafted or changed ADR.
  - `tool-conventions` after touching `server/src/tools/`.
  - `secret-scanner` before committing or opening a PR.
- Never write the classroom credential (or any secret) into the repo, `CLAUDE.md`, ADRs, or test fixtures. The committed URL in deploy.yml is the only channel.
