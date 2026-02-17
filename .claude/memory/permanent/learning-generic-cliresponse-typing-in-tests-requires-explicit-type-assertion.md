---
id: learning-generic-cliresponse-typing-in-tests-requires-explicit-type-assertion
title: Generic CliResponse typing in tests requires explicit type assertion
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-07T09:24:35.723Z"
updated: "2026-02-16T22:30:07.545Z"
tags:
  - typescript
  - testing
  - generics
  - project
---

When testing generic CliResponse<T> where T = unknown, TypeScript cannot infer result.data properties. Solution: cast result.data as the expected type (e.g., as { agents: AgentSummary[] }) after status check, or use non-null assertions on array access when length is verified.
