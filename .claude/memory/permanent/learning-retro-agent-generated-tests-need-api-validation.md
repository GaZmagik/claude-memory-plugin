---
id: learning-retro-agent-generated-tests-need-api-validation
title: retro-agent-generated-tests-need-api-validation
type: permanent
scope: local
project: claude-memory-plugin
created: "2026-01-11T22:41:51Z"
updated: "2026-01-12T22:02:47.192Z"
tags:
  - learning
  - tip
  - medium
  - retrospective
  - process
  - testing
  - agent-coordination
---

# retro-agent-generated-tests-need-api-validation

**Category:** tip
**Severity:** medium
**Date:** 2026-01-11

## Context

After comprehensive test generation, 9 failures emerged from API mismatches
Required ~40 lines of manual fixes across multiple files
Pattern errors (like addEdge) should have been caught globally

## Problem

Agent-generated test suites assumed APIs without verification

test-quality-expert created 100+ tests but made false assumptions:
- Function signatures: addEdge(graph, {obj}) vs addEdge(graph, src, tgt, label)
- Return types: resolveScope() returns direct Scope vs {scope: Scope, path: ...}
- Implementation behavior: loadIndex validates JSON shape vs returns parsed value

## Solution

Post-agent test generation workflow:
1. Run sample test from each new test file
2. Identify and fix pattern errors globally (not iteratively)
3. Then run full suite

Prevents 1-by-1 discovery and fixing of systematic issues
