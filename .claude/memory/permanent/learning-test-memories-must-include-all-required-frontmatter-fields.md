---
id: learning-test-memories-must-include-all-required-frontmatter-fields
title: Test memories must include all required frontmatter fields
type: learning
scope: project
created: "2026-02-04T22:44:16.295Z"
updated: "2026-02-04T22:44:16.295Z"
tags:
  - testing
  - frontmatter
  - validation
  - memory-operations
  - project
---

When creating test memory objects in agent operation tests, all required frontmatter fields must be present: type, title, created, updated (timestamps), tags, agent, scope. Missing fields cause parseFrontmatter() validation to fail even in lenient mode. Applied to rename.spec.ts - added missing title/created/updated fields to test memory objects.
