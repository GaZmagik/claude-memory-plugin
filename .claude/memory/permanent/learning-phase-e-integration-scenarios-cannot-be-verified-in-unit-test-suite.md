---
id: learning-phase-e-integration-scenarios-cannot-be-verified-in-unit-test-suite
title: Phase E integration scenarios cannot be verified in unit test suite
type: learning
scope: project
project: claude-memory-plugin
created: "2026-03-08T04:33:07.275Z"
updated: "2026-03-08T04:33:24.340Z"
tags:
  - testing
  - integration-tests
  - test-boundaries
  - ollama
  - phase-planning
  - project
---

During feature-006 specification validation, recognized that Phase E integration scenarios (T104-T114, T116) require live Ollama instance and cannot be tested within normal test suite boundaries. Parallel verb discovery: test suites validate internal logic paths, but external integration scenarios need acceptance/integration test environments. Useful boundary marker for future phases.
