---
id: gotcha-provider-cli-startup-timeouts-need-120s-not-30s
title: Gotcha - Provider CLI startup timeouts need 120s not 30s
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-26T14:25:21.558Z"
updated: "2026-02-01T22:38:06.852Z"
tags:
  - retrospective
  - gotcha
  - provider-routing
  - timeout
  - project
severity: high
---

Provider CLIs (codex, gemini) have slow startup due to MCP server initialization and extension loading. 30s timeout is too short - they need 120s (2 minutes). Initial issue: both providers appeared to fail silently when they were just timing out. Fixed by increasing timeout in buildCodexCommand() and buildGeminiCommand() from 30000ms to 120000ms. Without this, provider routing works architecturally but fails in practice.
