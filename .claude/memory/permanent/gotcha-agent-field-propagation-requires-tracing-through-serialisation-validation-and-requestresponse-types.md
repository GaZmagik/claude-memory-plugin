---
id: gotcha-agent-field-propagation-requires-tracing-through-serialisation-validation-and-requestresponse-types
title: Agent field propagation requires tracing through serialisation, validation, and request/response types
type: gotcha
scope: project
created: "2026-02-03T05:50:20.687Z"
updated: "2026-02-03T05:50:20.687Z"
tags:
  - agent-scoped
  - api-design
  - type-safety
  - project
---

Agent field in frontmatter must be traced through ALL layers: serialisation, validation, createFrontmatter, API request types, AND response types. Failure to propagate through any layer causes silent field loss in API responses.
