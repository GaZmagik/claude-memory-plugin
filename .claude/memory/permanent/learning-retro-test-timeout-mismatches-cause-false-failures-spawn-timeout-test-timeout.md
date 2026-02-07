---
id: learning-retro-test-timeout-mismatches-cause-false-failures-spawn-timeout-test-timeout
title: Retro - Test timeout mismatches cause false failures (spawn timeout != test timeout)
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-25T23:21:51.305Z"
updated: "2026-02-01T22:38:06.150Z"
tags:
  - retrospective
  - process
  - testing
  - project
severity: medium
---

Hook tests had spawn() timeouts of 30s but bun:test default timeout was 5s. Tests timed out silently at test level while subprocess was still running. Solution: Explicitly set test-level timeouts that exceed spawn timeouts (e.g., test timeout 15s > spawn timeout 10s). Applied to memory-context.spec.ts with success.
