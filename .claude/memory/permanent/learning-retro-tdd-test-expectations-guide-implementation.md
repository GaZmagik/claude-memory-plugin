---
id: learning-retro-tdd-test-expectations-guide-implementation
title: retro-tdd-test-expectations-guide-implementation
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-10T21:05:07Z
updated: 2026-01-10T21:05:09Z
tags: ["learning","retro","medium"]
embedding: "54f643ab4e7734b87a654311dfe24ddd"
links: []
---

# retro-tdd-test-expectations-guide-implementation

**Category:** retro
**Severity:** medium
**Date:** 2026-01-10

## Context

When writing TDD tests for scoring functions, vague expectations can lead to overengineered implementations.

## Problem

scoreTagMatch test expected both 100% match AND proportional scaling with bonus for absolute matches. This created conflicting requirements that forced a contrived formula.

## Solution

1. Write tests with explicit intent documented in comments
2. Test actual numeric ranges (0.5, 0.8) not just "greater than"
3. If bonus scoring exists, document why in code comment
