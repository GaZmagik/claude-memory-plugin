---
id: learning-type-scope-fields-consistently-as-scope-enum-not-string-literals
title: Type scope fields consistently as Scope enum, not string literals
type: learning
scope: project
project: claude-memory-plugin
created: "2026-03-07T18:30:46.428Z"
updated: "2026-03-07T18:30:52.281Z"
tags:
  - typescript
  - types
  - consistency
  - refactoring
  - project
---

EdgeMetadata and LinkMemoriesRequest had sourceScope/targetScope typed as `string` while graph operations expected `Scope` enum values. This led to scattered `as Scope` casts throughout code (edges.ts, link.ts). Fixed by: (1) typing scope fields as `Scope` enum in both type definitions, (2) removing all `as Scope` casts, (3) replacing string literals like 'agent-project' with Scope.AgentProject. Prevents type pollution and improves maintainability.
