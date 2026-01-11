---
id: learning-regex-based-language-parsing-tradeoff
title: regex-based-language-parsing-tradeoff
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T18:49:01Z
updated: 2026-01-11T18:49:03Z
tags: ["learning","insight","medium"]
embedding: "bf3e79948e3c2ae13d5ecc8db9a7cc04"
links: []
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
