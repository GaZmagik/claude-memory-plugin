---
id: learning-tdd-parity-vitest-limitation
title: tdd-parity-vitest-limitation
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T23:27:00Z
updated: 2026-01-12T08:37:10Z
tags: ["learning","gotcha","medium"]
embedding: "8e7d097982ad9ed1bff357a8ec922d42"
links: [
  "decision-colocate-unit-tests",
  "learning-cargo-cult-tdd-compliance",
  "learning-test-isolation-bun-mock-module"
]
---

# tdd-parity-vitest-limitation

**Category:** gotcha
**Severity:** medium
**Date:** 2026-01-11

## Context

Running TDD parity checks on vitest TypeScript projects

## Problem

Tools report 0% unit test coverage because vitest uses "it('should do X')" naming, not "test_functionName". Function-level matching fails.

## Solution

Accept file-level parity as the real metric for TypeScript/vitest. Function-level coverage reporting is unreliable with modern test conventions. Consider colocation of unit tests with source instead.
