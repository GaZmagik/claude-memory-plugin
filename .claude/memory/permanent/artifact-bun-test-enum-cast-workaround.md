---
id: artifact-bun-test-enum-cast-workaround
title: bun:test enum casting workaround for typed toBe() matchers
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-24T07:59:32.203Z"
updated: "2026-02-24T07:59:32.809Z"
tags:
  - bun
  - testing
  - enums
  - type-system
  - project
---

When bun:test's typed toBe() overload rejects enum values, cast the actual to string: expect((value as string)).toBe('expected'). Bypasses overload signature matching while maintaining type safety.
