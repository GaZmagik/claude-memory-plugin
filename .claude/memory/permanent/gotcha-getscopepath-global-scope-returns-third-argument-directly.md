---
id: gotcha-getscopepath-global-scope-returns-third-argument-directly
title: getScopePath Global scope returns third argument directly
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-18T20:49:34.774Z"
updated: "2026-02-19T06:33:18.739Z"
tags:
  - scope-resolver
  - path-computation
  - project
---

getScopePath(Scope.Global, cwd, globalPath) returns the globalPath argument unchanged, not a computed path. Passing '' results in silent empty string. Must compute global path separately with path.join(os.homedir(), '.claude', 'memory').
