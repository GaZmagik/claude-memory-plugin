---
type: decision
title: Index format migration prevented silent failures
created: "2026-01-12T20:40:14.159Z"
updated: "2026-01-12T20:40:14.159Z"
tags:
  - retrospective
  - process
  - quality
  - memory-plugin
  - testing
  - project
scope: project
---

# Retrospective: Index Format Migration Detected via Tests

Bash version used absolute 'file' paths in index.json, TypeScript expected 'relativePath'. This would have silently failed in production (search command throwing TypeError).

Detection: During search debug, traced error to path.join(basePath, undefined). Added migration layer in loadIndex() with 4 new tests covering legacy 'file' field conversion, fallback construction, and think document detection.

Key insight: Cross-version format mismatches are expensive late. Test coverage on format conversions prevents these gaps.
