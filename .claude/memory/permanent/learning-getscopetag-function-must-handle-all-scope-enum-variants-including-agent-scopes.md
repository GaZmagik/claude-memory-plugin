---
id: learning-getscopetag-function-must-handle-all-scope-enum-variants-including-agent-scopes
title: getScopeTag() Function Must Handle All Scope Enum Variants Including Agent Scopes
type: learning
scope: project
created: "2026-02-03T20:44:39.172Z"
updated: "2026-02-03T20:44:39.172Z"
tags:
  - phase-b
  - agent-scoped
  - formatters
  - typescript
  - scope-enum
  - project
---

The getScopeTag() function in formatters.ts provides scope indicators (E, P, G, etc.). When new scope variants are added (AgentProject, AgentGlobal), the switch statement must be updated to handle them or TypeScript compilation fails with 'variable used before being assigned'. Solution: add cases for all new scope enum variants to the switch statement.
