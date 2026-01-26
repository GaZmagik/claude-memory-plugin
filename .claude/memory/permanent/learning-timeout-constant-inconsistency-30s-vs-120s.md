---
id: learning-timeout-constant-inconsistency-30s-vs-120s
title: "Timeout constant inconsistency: Claude (30s) vs Codex/Gemini (120s)"
type: learning
scope: project
created: "2026-01-26T22:33:55.133Z"
updated: "2026-01-26T22:33:55.133Z"
tags:
  - timeouts
  - providers
  - v1.1.1
  - constants
  - project
---

Provider commands had mismatched timeout constants: Claude used 30s (DEFAULT_TIMEOUT_MS) but Codex/Gemini needed 120s (SLOW_PROVIDER_TIMEOUT_MS) for MCP startup. Fixed by unifying providers.ts constants and updating ai-invoke.ts to use them consistently. The 120s requirement is documented in gotcha-provider-cli-startup-timeouts-need-120s-not-30s.
