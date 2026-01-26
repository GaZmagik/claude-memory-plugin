---
id: decision-v112-marketplace-requires-dependency-and-timeout-fixes
title: v1.1.2 must include SessionStart bun install and hook timeout fixes
type: decision
scope: project
created: "2026-01-26T22:34:00.542Z"
updated: "2026-01-26T22:34:00.542Z"
tags:
  - v1.1.2
  - release
  - hooks
  - marketplace
  - project
---

PostToolUse memory injection is completely broken in marketplace plugin due to missing node_modules and insufficient timeouts. v1.1.2 requires: (1) SessionStart hook to auto-run 'bun install', (2) PostToolUse timeout 10s→30s, (3) UserPromptSubmit timeout 2s→10s, (4) Add explicit 'matcher: "*"' to hooks.json. These are critical for all memory features to work.
