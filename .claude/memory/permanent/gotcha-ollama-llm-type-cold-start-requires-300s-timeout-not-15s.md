---
id: gotcha-ollama-llm-type-cold-start-requires-300s-timeout-not-15s
title: Ollama --llm-type cold-start requires 300s timeout, not 15s
type: gotcha
scope: project
created: "2026-02-18T18:07:21.299Z"
updated: "2026-02-18T18:07:21.299Z"
tags:
  - ollama
  - timeout
  - suggest-links
  - llm-type
  - v1.5.0
  - project
---

# Gotcha: Ollama cold-start requires long timeouts for LLM generation

## Problem
During real smoke testing of `suggest-links --auto-link --llm-type`, nearly all 20 Ollama `generate()` calls timed out at 15s. The `/api/tags` endpoint (used by `isAvailable()`) responds in <1s, so `isAvailable()` returns `true`, but the actual generation call times out for a cold/unloaded model.

## Resolution
Made `generate()` accept an optional `timeoutMs` parameter (default: 15_000):
- `suggest-links --llm-type` passes `300_000` (5 minutes)
- `update-edge --verify` passes `60_000` (1 minute)

Only 2 of 20 suggestions got `verifiedRelation` in the first run (when the model warmed up). After increasing to 300s, the model should have time to load.

## Pattern
```typescript
const llmResult = await generate(prompt, undefined, 300_000); // suggest-links
const llmResult = await generate(prompt, undefined, 60_000);  // update-edge
```

## Similarity still works without LLM
Even when all Ollama calls timeout, the `similarity` field is correctly stored on edges created by `--auto-link`. The graceful degradation works — 20/20 edges created with similarity, 2/20 got verifiedRelation (those where model was warm).
