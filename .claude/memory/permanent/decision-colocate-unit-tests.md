---
id: decision-colocate-unit-tests
title: colocate-unit-tests
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T23:27:12Z
updated: 2026-01-11T23:27:14Z
tags: ["decision","adr","architecture","accepted"]
embedding: "141f3084a2c1202235a04825e4d4399c"
links: []
---

# colocate-unit-tests

**Status:** accepted
**Date:** 2026-01-11

## Context

Debate about test file organization - separate tests/unit vs colocated with source

## Decision

Colocate unit tests with source code. Skills go in skills/memory/src/*.spec.ts. Hooks go in .claude/hooks/ts/*.spec.ts. Keep integration/contract tests in tests/integration and tests/contract.

## Consequences

No consequences documented

## Alternatives Considered

No alternatives documented
