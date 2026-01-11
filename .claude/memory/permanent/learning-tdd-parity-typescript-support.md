---
id: learning-tdd-parity-typescript-support
title: tdd-parity-typescript-support
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T18:48:56Z
updated: 2026-01-11T18:48:58Z
tags: ["learning","tip","medium"]
embedding: "42797bf262a595276d5139ca0b56159c"
links: []
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
