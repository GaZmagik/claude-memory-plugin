---
id: learning-regex-based-language-parsing-tradeoff
title: regex-based-language-parsing-tradeoff
type: decision
scope: local
project: claude-memory-plugin
created: "2026-01-11T18:49:01Z"
updated: "2026-01-13T13:24:05.777Z"
tags:
  - insight
  - learning
  - medium
  - tdd-parity
  - typescript
links:
  - learning-retro-typescript-tooling-parity
---

# regex-based-language-parsing-tradeoff

**Category:** insight
**Severity:** medium
**Date:** 2026-01-11

## Context

Adding TypeScript support to Python-based tdd-parity tool for test file analysis

## Problem

Using regex for TS parsing lacks robustness of proper AST analysis. False positives/negatives on complex syntax. Function name extraction from vitest test descriptions is necessarily lossy.

## Solution

Trade-off: regex parsing is acceptable for file-level parity (detecting "does test file exist for source file"). For function-level analysis, either accept lossy matching or use TypeScript compiler API (ts-morph) for proper AST. Current implementation documents this limitation.
