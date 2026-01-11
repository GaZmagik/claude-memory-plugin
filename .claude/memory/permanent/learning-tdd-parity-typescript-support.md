---
id: learning-tdd-parity-typescript-support
title: tdd-parity-typescript-support
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T18:48:56Z
updated: 2026-01-11T21:06:45Z
tags: ["learning","medium","tdd-parity","tip","typescript"]
embedding: "66d458ac7a11b60ecedcf3be2a7949e6"
links: [
  "learning-regex-based-language-parsing-tradeoff",
  "learning-retro-typescript-tooling-parity"
]
---

# tdd-parity-typescript-support

**Category:** tip
**Severity:** medium
**Date:** 2026-01-11

## Context

Extended tdd-parity Python tool to support TypeScript projects

## Problem

Original tdd-parity only supported Python. TypeScript projects had no test parity auditing capability.

## Solution

Created typescript.py module with regex-based AST parsing for .ts files. Added Language enum with AUTO detection in core.py. Updated cli.py with --language flag. File-level parity analysis works well; function-level matching is lossy (vitest descriptive strings vs Python test_* convention).
