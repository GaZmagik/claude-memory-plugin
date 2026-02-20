---
id: learning-nodejs-code-review-sync-file-ops-block-event-loop
title: Node.js Code Review - Sync File Ops Block Event Loop
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-20T16:47:04.003Z"
updated: "2026-02-20T17:46:02.353Z"
tags:
  - nodejs
  - performance
  - async
  - event-loop
  - file-system
  - project
---

# Critical Finding: Synchronous File Operations in External File Discovery

## Location
`skills/memory/src/external/external-file-discovery.ts`

## Issue
The external file discovery module uses synchronous Node.js file system operations throughout, blocking the event loop during directory tree traversal:

- `fs.readFileSync()` in `calculateContentHash()` (line 25)
- `fs.statSync()` in `getModifiedTime()` (line 38)
- `fs.realpathSync()` in `resolveSymlink()` (line 58)
- `fs.existsSync()`, `fs.statSync()`, `fs.readdirSync()` in discovery functions (lines 240+)

## Impact
During discovery of external files (CLAUDE.md across directory hierarchy, rules/*.md, agent MEMORY.md), each synchronous operation blocks the event loop:

- UI/CLI freezing during indexing
- Cannot handle other async operations
- Poor performance on large codebases or slow filesystems
- Timeouts in CI/CD environments
- Network mounted filesystems particularly affected

## Additional Locations
`skills/memory/src/search/embedding.ts` also uses sync operations:
- `fs.existsSync()` line 83
- `fs.readFileSync()` line 88
- `fs.mkdirSync()` line 105

## Severity
HIGH - Production code that runs during indexing operations

## Required Fix
Convert all synchronous file operations to async/await using `node:fs/promises`:

```typescript
// Before (BLOCKS)
const content = fs.readFileSync(filePath, 'utf-8');
const hash = crypto.createHash('sha256').update(content).digest('hex');

// After (NON-BLOCKING)
const content = await fsp.readFile(filePath, 'utf-8');
const hash = crypto.createHash('sha256').update(content).digest('hex');
```

## Context
The `fs-utils.ts` module already implements proper async patterns - discovery module should follow same pattern.
