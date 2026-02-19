---
id: learning-retro-aspirational-tests-without-integration-context-cause-red-phase-delays
title: Retro - Aspirational tests without integration context cause RED phase delays
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T11:02:17.510Z"
updated: "2026-02-19T11:03:33.168Z"
tags:
  - retrospective
  - process
  - tdd
  - testing
  - project
severity: medium
---

Phase 2B wrote ambitious tests first (embeddings, cache reuse, dry-run modes) before understanding full integration requirements. Tests failed to run initially because infrastructure (temp paths, file I/O) wasn't mocked properly. Pattern: Write minimal stub tests that pass trivially first (RED baseline), then flesh out expectations once integration points are clear. This prevents wasting time debugging test infrastructure instead of implementation logic.
