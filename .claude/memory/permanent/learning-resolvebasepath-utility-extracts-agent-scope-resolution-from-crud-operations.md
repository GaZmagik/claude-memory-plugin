---
id: learning-resolvebasepath-utility-extracts-agent-scope-resolution-from-crud-operations
title: resolveBasePath utility extracts agent-scope resolution from CRUD operations
type: learning
scope: project
created: "2026-02-26T22:01:57.326Z"
updated: "2026-02-26T22:01:57.326Z"
tags:
  - refactoring
  - agent-scope
  - dry
  - utility
  - project
---

The ~20-line agent-scope resolution block (isAgentScope check, agent guard, projectRoot/globalRoot derivation, getAgentDirectoryPath call) was duplicated across read.ts, delete.ts, search.ts, and semantic-search.ts.

Extracted into skills/memory/src/scope/resolve-base-path.ts as resolveBasePath(request: BasePathRequest): BasePathResult.

Key design decisions:
- Returns a discriminated union { basePath } | { error } — callers map error to their own response shape.
- write.ts is NOT refactored here because it also calls createAgentDirectory (async dir creation) and runs sanitiseAgentName/validateAgentName before path resolution — those extra steps keep it distinct.
- The utility is synchronous (getAgentDirectoryPath is sync); callers do not need to await it.
- TDD hook required `touch` stub before Write was allowed on the new source file.
