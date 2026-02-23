---
id: gotcha-retro-test-pollution-isolated-tests-pass-but-fail-in-full-suite
title: "Retro - Test pollution: isolated tests pass but fail in full suite"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-22T23:11:27.910Z"
updated: "2026-02-23T06:32:34.982Z"
tags:
  - retrospective
  - process
  - testing
  - test-pollution
  - project
severity: high
---

A heuristics test (AutoSelector > uses heuristics for security keywords) passed when run in isolation but failed in the full suite with unexpected state ('Received: default' instead of 'heuristics'). This indicates test interdependencies or shared state mutation not caught by isolated runs. Future fix: run full suite earlier in debugging cycle, not as final verification. Pattern: when a test passes in isolation but fails in suite, suspect test ordering dependencies or shared fixtures.
