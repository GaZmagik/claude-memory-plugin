---
id: decision-suggest-links-consolidate-scopes-into-all-scopes
title: consolidate --include-shared and --all-scopes flags
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-22T21:49:32.979Z"
updated: "2026-02-22T21:49:36.341Z"
tags:
  - suggest-links
  - api-design
  - consolidation
  - project
---

Plan to consolidate --include-shared and --all-scopes flags in suggest-links into single --all-scopes approach. Fixes silently-dropped cross-scope bug and simplifies CLI surface. See plan: vivid-inventing-lerdorf.md
