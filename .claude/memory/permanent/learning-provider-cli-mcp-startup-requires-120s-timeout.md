---
id: learning-provider-cli-mcp-startup-requires-120s-timeout
title: Provider CLI MCP startup requires 120s timeout
type: learning
scope: project
created: "2026-01-26T16:24:33.927Z"
updated: "2026-01-26T16:24:33.927Z"
tags:
  - provider
  - timeout
  - mcp
  - reliability
  - project
---

Codex and Gemini CLIs load MCP extensions on startup (nanobanana, osvScanner, security). Default 30s timeout is too short. Minimum 120s required to avoid spurious failures.
