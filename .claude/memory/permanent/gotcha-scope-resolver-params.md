---
id: gotcha-scope-resolver-params
title: getScopePath() Requires (scope, cwd, globalPath) Not Just Scope
type: permanent
scope: project
tags: [gotcha, cli, scope-resolution, critical]
severity: medium
created: 2026-01-12T15:47:00Z
updated: 2026-01-12T15:47:00Z
---

# Gotcha: getScopePath() Signature

## The Issue

Initial CLI command handlers called `getScopePath(scope)` thinking it only needed the scope enum. This fails silently or throws.

## The Reality

The correct signature is:
```typescript
getScopePath(scope: Scope, cwd: string, globalMemoryPath: string): string
```

All three parameters are required:
- `scope`: The Scope enum (Global, Project, Local, Enterprise)
- `cwd`: Current working directory (usually `process.cwd()`)
- `globalMemoryPath`: Global memory path (usually `path.join(os.homedir(), '.claude', 'memory')`)

## Pattern for Command Handlers

Every CLI command handler should have:
```typescript
function getGlobalMemoryPath(): string {
  return path.join(os.homedir(), '.claude', 'memory');
}

function getResolvedScopePath(scope: Scope): string {
  const cwd = process.cwd();
  const globalPath = getGlobalMemoryPath();
  return getScopePath(scope, cwd, globalPath);
}
```

Then use `getResolvedScopePath(scope)` in handlers.

## Why This Matters

Without all three params, scope resolution can't:
- Find git root for project/local scope
- Know where user's global memory lives
- Support enterprise scope paths

Applied to: CRUD, quality, maintenance, utility, bulk, query commands.
