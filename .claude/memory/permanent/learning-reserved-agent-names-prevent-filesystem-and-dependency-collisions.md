---
id: learning-reserved-agent-names-prevent-filesystem-and-dependency-collisions
title: Reserved agent names prevent filesystem and dependency collisions
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-09T10:52:11.045Z"
updated: "2026-02-16T22:30:07.500Z"
tags:
  - validation
  - naming-conventions
  - filesystem-safety
  - project
---

Expanded RESERVED_NAMES to 14 entries (tmp, temp, test, tests, node_modules, dist, build, out, lib, bin, src, vendor, coverage, docs) to prevent agent names from colliding with common directory structures. This protects against memory being stored inside build artifacts or overlapping with project scaffolding conventions.
