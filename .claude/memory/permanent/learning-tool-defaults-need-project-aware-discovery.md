---
id: learning-tool-defaults-need-project-aware-discovery
title: Tool defaults need project-aware discovery
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-15T08:03:26.660Z"
updated: "2026-01-16T13:44:26.638Z"
tags:
  - retrospective
  - process
  - tooling
  - discovery
  - project
---

TDD parity's hardcoded defaults (src/, tests/unit/) failed silently on TypeScript project with colocated tests. Config file (.tddparity.json) solved friction but better: auto-detect project layout or fail loudly with discovery guidance.
