---
id: learning-provider-cli-timeout-requirements
title: Provider CLIs need 120s+ timeouts for startup
type: learning
scope: project
created: "2026-01-26T14:25:32.830Z"
updated: "2026-01-26T14:25:32.830Z"
tags:
  - provider-integration
  - performance
  - timeout
  - v1.1.1
  - project
---

Codex and Gemini CLIs have slow startup (60-120s+) due to MCP server initialization and extension loading. A 30s timeout is insufficient. Must use at least 120s timeouts to allow both CLI startup and actual inference execution.
