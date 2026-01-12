---
id: learning-retro-agent-verification-for-exclusions
title: retro-agent-verification-for-exclusions
type: permanent
scope: local
project: claude-memory-plugin
created: "2026-01-12T08:32:37Z"
updated: "2026-01-12T22:02:47.183Z"
tags:
  - learning
  - tip
  - medium
links:
  - learning-retro-agent-generated-tests-need-api-validation
---

# retro-agent-verification-for-exclusions

**Category:** tip
**Severity:** medium
**Date:** 2026-01-12

## Context

Test coverage validation and .tddignore maintenance

## Problem

When documenting exclusions in .tddignore, manual code inspection can miss coverage gaps. The semantic-search.ts functions were marked as "tested via gotcha-injector.spec.ts" but the agent found zero test coverage.

## Solution

Before updating .tddignore with exclusions, run test-quality-expert audit to verify coverage claims. Update comments to be honest (NOT TESTED, requires mocking X) rather than aspirational.
