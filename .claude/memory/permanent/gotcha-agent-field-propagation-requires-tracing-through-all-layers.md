---
id: gotcha-agent-field-propagation-requires-tracing-through-all-layers
title: Agent field propagation requires tracing through all layers
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-04T09:48:32.997Z"
updated: "2026-02-16T22:30:07.451Z"
tags:
  - gotcha
  - agent-field
  - propagation
  - BaseRequest
  - feature-003
  - critical
  - project
---

Adding agent field to BaseRequest automatically extends all derived request types. Must propagate through: serialisation layer, validation layer, createFrontmatter function, ALL request type constructors, AND response properties. Missing propagation in any layer causes silent failures where agent context disappears.
