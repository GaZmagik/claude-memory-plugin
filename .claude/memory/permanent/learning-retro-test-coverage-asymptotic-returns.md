---
id: learning-retro-test-coverage-asymptotic-returns
title: retro-test-coverage-asymptotic-returns
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T18:49:02Z
updated: 2026-01-11T21:06:35Z
tags: ["learning","insight","medium","retrospective","process","testing","coverage"]
embedding: "f2deac0051697ba07cf0ce97d28d5f51"
links: []
---

# retro-test-coverage-asymptotic-returns

**Category:** insight
**Severity:** medium
**Date:** 2026-01-11

## Context

Improved test coverage from 91% (586 tests) to 99.12% functions / 96.50% lines (837 tests) during this session

## Problem

Final 3.5% of lines were mostly filesystem error catch blocks - hard to test without mocking disk failures

## Solution

Recognized diminishing returns and stopped. Focused effort on high-impact areas (validation, logging, graph functions) which yielded better coverage per test

## Prevention

Use line coverage reports to identify if remaining gaps are error paths, legacy code, or unreachable branches before deciding effort is worth it
