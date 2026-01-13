---
id: learning-retro-test-isolation-pattern-worth-documenting
title: retro-test-isolation-pattern-worth-documenting
type: learning
scope: local
project: claude-memory-plugin
created: "2026-01-12T08:32:49Z"
updated: "2026-01-12T22:02:47.189Z"
tags:
  - learning
  - tip
  - medium
links:
  - learning-test-isolation-bun-mock-module
---

# retro-test-isolation-pattern-worth-documenting

**Category:** tip
**Severity:** medium
**Date:** 2026-01-12

## Context

Managing vitest mock pollution in colocated tests

## Problem

vi.mock() and mock.module() persist globally. Original approach was to use vi.resetModules() between tests - this made things worse (208 failures vs 173).

## Solution

Process isolation via separate bun invocations (test:clean && test:isolated) eliminated all failures. This pattern (hybrid isolation: non-mocking tests together, mock-heavy tests in separate processes) should be documented for future projects with vitest/bun.
