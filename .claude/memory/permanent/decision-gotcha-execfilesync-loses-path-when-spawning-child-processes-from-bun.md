---
id: decision-gotcha-execfilesync-loses-path-when-spawning-child-processes-from-bun
title: "Gotcha: execFileSync loses PATH when spawning child processes from Bun"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:31:27.884Z"
updated: "2026-01-12T22:02:47.194Z"
tags:
  - retrospective
  - gotcha
  - subprocess
  - project
---

# Gotcha: execFileSync PATH Environment in Bun

## Problem
Memory skill's `think --call claude` feature failed with:
```
spawn-rx Failed to find executable anywhere in path
```

Claude CLI (`/home/gareth/.local/bin/claude`) exists and works from interactive shell.

## Root Cause
When `execFileSync('claude', args, ...)` runs from within Bun, the child process doesn't inherit the shell's expanded PATH. The executable path is not resolved.

## Solution
Two approaches:
1. Use absolute path: `execFileSync('/home/gareth/.local/bin/claude', ...)`
2. Pass explicit PATH in env option:
   ```typescript
   execFileSync('claude', args, {
     env: { ...process.env, PATH: process.env.PATH + ':/home/gareth/.local/bin' }
   })
   ```

## File
`~/.vs/claude-memory-plugin/skills/memory/src/think/ai-invoke.ts` - lines 150-157

## Applies To
Any TypeScript/Bun code spawning executables from `~/.local/bin/`. Test thoroughly on CI if PATH differs from dev environment.
