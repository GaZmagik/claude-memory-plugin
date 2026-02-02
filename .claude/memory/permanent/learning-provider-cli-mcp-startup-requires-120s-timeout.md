---
id: learning-provider-cli-mcp-startup-requires-120s-timeout
title: Provider CLI MCP startup requires 120s timeout
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-26T16:24:33.927Z"
updated: "2026-02-01T22:38:06.492Z"
tags:
  - provider
  - timeout
  - mcp
  - reliability
  - project
---

Codex and Gemini CLIs load MCP extensions on startup (nanobanana, osvScanner, security). Default 30s timeout is too short. Minimum 120s required to avoid spurious failures.
