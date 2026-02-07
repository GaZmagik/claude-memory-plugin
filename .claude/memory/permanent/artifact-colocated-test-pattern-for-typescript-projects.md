---
id: artifact-colocated-test-pattern-for-typescript-projects
title: Colocated Test Pattern for TypeScript Projects
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-01-26T00:12:13.916Z"
updated: "2026-02-01T22:38:06.304Z"
tags:
  - testing
  - typescript
  - project-structure
  - project
---

Store test files alongside source files (src/foo.ts + src/foo.spec.ts) rather than in separate directories. Advantages: easier to locate tests, better IDE navigation, clearer ownership. Use .tddignore to exclude index.ts and type definition files from TDD parity checks. Achieves 94-96% effective coverage with vitest.
