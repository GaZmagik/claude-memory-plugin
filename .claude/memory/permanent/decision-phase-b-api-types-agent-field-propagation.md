---
id: decision-phase-b-api-types-agent-field-propagation
title: "Phase B: Add agent field to all API request and response types"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-02T23:20:40.595Z"
updated: "2026-02-16T22:30:07.421Z"
tags:
  - api-design
  - type-safety
  - agent-scoped
  - phase-b
  - project
---

Decision to add optional agent field to WriteMemoryRequest, ReadMemoryRequest, ListMemoriesRequest, DeleteMemoryRequest, SearchMemoriesRequest, SemanticSearchRequest and their response types (MemorySummary, SearchResult, etc). This ensures agent context flows through entire API boundary.
