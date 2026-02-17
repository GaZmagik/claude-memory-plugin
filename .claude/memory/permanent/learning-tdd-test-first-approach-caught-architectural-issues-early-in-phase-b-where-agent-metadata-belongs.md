---
id: learning-tdd-test-first-approach-caught-architectural-issues-early-in-phase-b-where-agent-metadata-belongs
title: TDD test-first approach caught architectural issues early in Phase B (where agent metadata belongs)
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-03T05:50:47.700Z"
updated: "2026-02-16T22:30:07.499Z"
tags:
  - tdd
  - test-design
  - architecture
  - agent-scoped
  - project
---

Red-Green-Refactor cycle with test-first development prevented premature file creation and discovered design problems early. For example, tests initially tried to store agent/scope in graph nodes, but test failure revealed these fields should only be in frontmatter/index. Test design forced architects to think about metadata placement before writing code.
