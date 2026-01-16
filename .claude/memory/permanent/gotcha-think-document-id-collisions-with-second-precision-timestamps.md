---
id: gotcha-think-document-id-collisions-with-second-precision-timestamps
title: Think document ID collisions with second-precision timestamps
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:03:00.825Z"
updated: "2026-01-16T23:10:43.633Z"
tags:
  - think
  - id-generation
  - timestamp
  - project
---

## Problem

Original `generateThinkId()` used second-precision timestamps (think-YYYYMMDD-HHMMSS). When creating multiple think documents in rapid succession (tests/integration), same-second collisions overwrote previous documents.

## Solution

Added millisecond precision: think-YYYYMMDD-HHMMSSmmm (9 digits after second hyphen). Backwards compatible - parser accepts both 6 and 9 digit formats.

## Changes

- `src/think/id-generator.ts`: Added milliseconds to ID generation and parsing
- `src/think/id-generator.spec.ts`: Updated tests to verify unique IDs with small delays
- `tests/integration/think-lifecycle.spec.ts`: Reduced delays from 1.1s to 5ms between document creates

## Impact

No longer need artificial delays in tests. IDs guaranteed unique within same second.
