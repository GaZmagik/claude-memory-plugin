---
id: gotcha-typescript-language-server-lag-after-dynamic-to-static-import-conversion
title: TypeScript language server lag after dynamic-to-static import conversion
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-26T19:13:57.309Z"
updated: "2026-02-26T19:14:22.115Z"
tags:
  - typescript
  - imports
  - diagnostics
  - lsp
  - gotcha
  - project
---

Converting dynamic imports to static imports triggers false-positive noUnusedLocals diagnostics until the language server re-analyzes. The imports ARE used in function bodies, but TS doesn't see them until it re-processes the file. Call mcp__ide__getDiagnostics() to trigger re-analysis or wait ~5s for automatic re-check.
