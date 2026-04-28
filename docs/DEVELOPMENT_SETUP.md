# Development Setup

This document defines the local setup required to work on DataPilot.

## Required Tools

| Tool | Purpose | Required for |
| --- | --- | --- |
| Go | API and Wails desktop backend | API, Desktop |
| Node.js | React/Vite toolchain | Web, Desktop UI |
| pnpm | Workspace package manager | Web, Desktop UI |
| Wails CLI | Desktop development and packaging | Desktop |
| GitHub CLI | PR and repository operations | Maintainers |

## Verify Environment

Run from the repository root:

```bash
go version
node --version
pnpm --version
```

For desktop work:

```bash
wails version
```

If `wails` is missing, install it before running desktop tasks.

## Install Wails CLI

Install Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

Ensure Go's bin directory is on `PATH`. Common locations:

```bash
$(go env GOPATH)/bin
```

Then verify:

```bash
wails version
```

## Validate Current Project

API:

```bash
go test ./apps/api/...
```

Web:

```bash
pnpm install
pnpm build:web
```

Desktop:

```bash
pnpm dev:desktop
```

Desktop validation requires Wails CLI and platform-specific WebView dependencies.

## Current Local Finding

During the first Desktop Foundation check, Wails CLI was not initially available in the local shell:

```text
wails: command not found
```

Wails CLI was then installed and verified:

```text
Wails CLI v2.12.0
wails doctor: Your system is ready for Wails development.
```

The desktop build chain has been validated with:

```bash
wails build
```
