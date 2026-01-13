---
id: learning-cargo-cult-tdd-compliance
title: cargo-cult-tdd-compliance
type: learning
scope: local
project: claude-memory-plugin
created: "2026-01-11T23:27:06Z"
updated: "2026-01-13T18:49:49.829Z"
tags:
  - learning
  - gotcha
  - high
links:
  - learning-tdd-parity-vitest-limitation
  - learning-retro-agent-generated-tests-need-api-validation
  - learning-test-agent-generates-aspirational-tests
  - artifact-tdd-testing-patterns-catalogue
---

# cargo-cult-tdd-compliance

**Category:** gotcha
**Severity:** high
**Date:** 2026-01-11

## Context

Found empty stub files (logger-stub.ts, validation-stub.ts) created during TDD parity check

## Problem

Previous session created 0-byte stub files to satisfy TDD parity tool complaints, without understanding what the tool actually wanted. The real implementations (logger.ts, validation.ts) had proper tests all along.

## Solution

When tooling complains, investigate root cause before cargo-culting compliance. Read the tool output carefully. Stubs were useless noise that cluttered the codebase.
