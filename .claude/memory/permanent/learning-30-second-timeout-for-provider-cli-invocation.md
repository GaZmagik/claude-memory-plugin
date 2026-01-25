---
id: learning-30-second-timeout-for-provider-cli-invocation
title: 30-second timeout for provider CLI invocation
type: learning
scope: project
created: "2026-01-25T20:51:39.697Z"
updated: "2026-01-25T20:51:39.697Z"
tags:
  - providers
  - timeout
  - cli
  - error-handling
  - v1.1.0
  - project
---

Provider CLI commands (claude, codex, gemini) must timeout after 30 seconds to prevent hanging agent processes. Implemented via execFileSync with timeout option in invoke.ts (T084b). This protects against provider CLI failures or infinite loops.
