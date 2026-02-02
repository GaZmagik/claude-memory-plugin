---
id: decision-v112-marketplace-fixes-comprehensive-approach
title: v1.1.2 marketplace fixes - comprehensive approach
type: decision
scope: project
project: claude-memory-plugin
created: "2026-01-28T01:18:31.638Z"
updated: "2026-02-01T22:38:06.698Z"
tags:
  - v1.1.2
  - marketplace
  - plugin-reliability
  - project
---

v1.1.2 addressed three distinct failures: (1) SessionStart auto-runs bun install for missing node_modules, (2) PostToolUse matcher field enabled for user-level hook merging, (3) Hook timeouts increased 10s→30s for Ollama cold-start. All three deployed together to prevent marketplace plugin hook failures.
