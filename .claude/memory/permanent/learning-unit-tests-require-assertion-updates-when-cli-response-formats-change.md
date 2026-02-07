---
id: learning-unit-tests-require-assertion-updates-when-cli-response-formats-change
title: Unit tests require assertion updates when CLI response formats change
type: learning
scope: project
created: "2026-02-05T23:49:23.643Z"
updated: "2026-02-05T23:49:23.643Z"
tags:
  - unit-tests
  - test-maintenance
  - CLI-commands
  - mocking
  - project
---

When cmdHealth/cmdStats response formats change (e.g., nodes→totalNodes, edges→totalEdges, or adding new fields like score/status/orphanedNodes), corresponding unit tests in quality.spec.ts and query.spec.ts must be updated. Mocks for new dependencies (loadGraph, loadIndex, findOrphanedNodes) must also be added to maintain test isolation.
