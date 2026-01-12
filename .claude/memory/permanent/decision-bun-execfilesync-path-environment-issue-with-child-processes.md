---
type: decision
title: Bun execFileSync PATH environment issue with child processes
created: "2026-01-12T20:31:21.892Z"
updated: "2026-01-12T20:31:21.892Z"
tags:
  - bun
  - subprocess
  - hooks
  - gotcha
  - project
scope: project
---

# Bun execFileSync PATH Issue

When `execFileSync()` spawns a child process from within a Bun script, the `PATH` environment variable doesn't inherit user bin directories (e.g., `/home/gareth/.local/bin`). This causes subprocess spawning of `claude` CLI to fail with: `spawn-rx Failed to find executable anywhere in path`.

**Fix**: Either use absolute path to executable or explicitly pass PATH in env option:
```typescript
execFileSync('/home/gareth/.local/bin/claude', args, ...)
// or
execFileSync('claude', args, { env: { ...process.env, PATH: process.env.PATH + ':/home/gareth/.local/bin' } })
```

Affects memory skill's AI invocation in think module.
