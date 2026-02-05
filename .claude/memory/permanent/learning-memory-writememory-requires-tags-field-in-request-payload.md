---
id: learning-memory-writememory-requires-tags-field-in-request-payload
title: Memory writeMemory requires tags field in request payload
type: learning
scope: project
created: "2026-02-05T16:11:14.922Z"
updated: "2026-02-05T16:11:14.922Z"
tags:
  - phase-e
  - testing
  - integration-tests
  - api-validation
  - project
---

Integration tests calling writeMemory() must include tags field as required property. Without tags, validation fails even for minimal test setup. Tests also must use MemoryType enum values, not string literals, and provide ID with correct type prefix.
