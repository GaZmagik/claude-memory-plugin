---
id: learning-retro-typescript-tooling-parity
title: retro-typescript-tooling-parity
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T18:48:56Z
updated: 2026-01-11T18:48:58Z
tags: ["learning","tip","high","retrospective","process","tooling","typescript"]
embedding: "d2afc81c46b538c40d282b9b96da8c29"
links: []
---

# retro-typescript-tooling-parity

**Category:** tip
**Severity:** high
**Date:** 2026-01-11

## Context

Updated tdd-parity tool to support TypeScript projects, which previously only analyzed Python files

## Problem

TDD parity relies on AST analysis, but Python's ast module doesn't work for TypeScript files

## Solution

Built regex-based TypeScript parser with language auto-detection. Separated analysis/collection pipelines per language (Python vs TypeScript). Made core logic polymorphic via function selection.

## Example

```
Pattern matching for exports: `export function name()` and `export const name = () => {}`, with convention mapping for test files (.spec.ts pattern)
```

## Prevention

When porting tools across languages, use abstract analysis interfaces early rather than language-specific implementations
