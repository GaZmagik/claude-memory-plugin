---
id: learning-test-isolation-bun-mock-module
title: test-isolation-bun-mock-module
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T17:55:16Z
updated: 2026-01-11T21:08:13Z
tags: ["learning","tip","medium","testing","bun","mock","isolation"]
embedding: "3e239f4d95f659bbf68bf6873f170489"
links: [
  "learning-tdd-test-coverage-expansion-pattern"
]
---

# test-isolation-bun-mock-module

**Category:** tip
**Severity:** medium
**Date:** 2026-01-11

## Context

Migrating test suite from vitest to bun:test with mocked modules

## Problem

vitest vi.mock() creates global module mocks that leak between test files. extract-context.spec.ts fs mocking polluted other tests in the same group. vitest vi.mocked() is not available in bun:test.

## Solution

Use bun mock.module() with original module spreading to avoid global leakage. Isolated test files use separate bun process. Pattern: mock.module('node:fs', () => ({ ...originalFs, writeFileSync: mockFn }))
