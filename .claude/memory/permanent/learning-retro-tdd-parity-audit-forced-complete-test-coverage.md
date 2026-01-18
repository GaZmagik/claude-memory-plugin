---
id: learning-retro-tdd-parity-audit-forced-complete-test-coverage
title: Retro - TDD parity audit forced complete test coverage
type: learning
scope: project
created: "2026-01-16T16:38:12.771Z"
updated: "2026-01-16T16:38:12.771Z"
tags:
  - retrospective
  - testing
  - tdd-parity
  - project
severity: medium
---

Running TDD parity check revealed 7 untested functions from this session (getAllMemoryIds, findMemoryFile, truncateForEmbedding, plus external calls). Writing tests increased coverage from 97.7% to 100% effective coverage. Pattern: Always run parity check at session end to catch new untested code before it ships. Identified that .tddignore already covered external calls properly.
