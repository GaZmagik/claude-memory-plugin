---
id: learning-agent-field-in-frontmatter-requires-tracing-through-all-serialisation-paths
title: Agent field in frontmatter requires tracing through all serialisation paths
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-02T23:20:15.638Z"
updated: "2026-02-16T22:30:07.435Z"
tags:
  - frontmatter
  - serialisation
  - agent-scoped
  - type-safety
  - project
---

When adding agent field to MemoryFrontmatter, must update serialiseFrontmatter(), createFrontmatter() signature, validateFrontmatter() rules, and all API request/response types (WriteMemoryRequest, ReadMemoryRequest, etc). Forgetting any location causes fields to silently disappear.
