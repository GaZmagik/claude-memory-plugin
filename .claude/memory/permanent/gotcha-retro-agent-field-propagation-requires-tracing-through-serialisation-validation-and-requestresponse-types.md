---
id: gotcha-retro-agent-field-propagation-requires-tracing-through-serialisation-validation-and-requestresponse-types
title: Retro - Agent field propagation requires tracing through serialisation, validation, AND request/response types
type: gotcha
scope: project
created: "2026-02-02T23:19:11.565Z"
updated: "2026-02-02T23:19:11.565Z"
tags:
  - retrospective
  - process
  - gotcha
  - field-propagation
  - phase-b
  - project
severity: high
---

Phase B implementation: Added agent field to MemoryFrontmatter but this is insufficient. Field must be explicitly included in: (1) serialiseFrontmatter order after scope field, (2) validation logic checking agent required for agent scopes, (3) createFrontmatter parameter handling, (4) API request types (WriteMemoryRequest, ReadMemoryRequest, DeleteMemoryRequest, SearchMemoriesRequest, SemanticSearchRequest), (5) WriteMemoryResponse.memory property. Failure to propagate through all layers causes silent field loss in API responses. Prevention: trace new fields through complete flow before implementation.
