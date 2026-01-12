---
id: learning-test-agent-generates-aspirational-tests
title: test-agent-generates-aspirational-tests
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T23:27:17Z
updated: 2026-01-11T23:27:19Z
tags: ["learning","gotcha","medium"]
embedding: "708e6610f43b149dde6538d159a537a9"
links: []
---

# test-agent-generates-aspirational-tests

**Category:** gotcha
**Severity:** medium
**Date:** 2026-01-11

## Context

test-quality-expert agent generated 14 new tests to improve coverage

## Problem

Agent wrote tests based on what it thought the code *should* do, not what it actually does. Tests expected error status when impl returns success; expected severity "warning" when impl uses "error"; expected result.memory.id field that doesn't exist.

## Solution

Always verify generated tests against actual implementation behavior. Agent-generated tests need review before commit. Function-level assertions are often wrong when agent doesn't see source.
