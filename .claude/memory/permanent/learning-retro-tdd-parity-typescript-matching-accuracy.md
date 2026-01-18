---
id: learning-retro-tdd-parity-typescript-matching-accuracy
title: retro-tdd-parity-typescript-matching-accuracy
type: learning
scope: local
project: claude-memory-plugin
created: "2026-01-12T08:32:43Z"
updated: "2026-01-12T22:02:47.188Z"
tags:
  - learning
  - tip
  - medium
links:
  - learning-tdd-parity-vitest-limitation
---

# retro-tdd-parity-typescript-matching-accuracy

**Category:** tip
**Severity:** medium
**Date:** 2026-01-12

## Context

Running TDD parity checks on TypeScript with colocated tests

## Problem

TDD parity tool uses import-based + describe-block matching for TypeScript. This misses cross-file coverage and functions tested via mock-heavy isolated tests (e.g., fork-detection.spec.ts tests all 8 functions but parity reports them as untested because vitest imports are traced differently).

## Solution

Document high-value false positives in .tddignore with explanations rather than trying to fix the tool. Cross-file coverage and isolated-test coverage are real but tooling-invisible. Accept 73% reported coverage when actual coverage is 97.4%.
