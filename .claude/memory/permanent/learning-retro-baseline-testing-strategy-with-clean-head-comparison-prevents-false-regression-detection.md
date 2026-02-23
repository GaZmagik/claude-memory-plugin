---
id: learning-retro-baseline-testing-strategy-with-clean-head-comparison-prevents-false-regression-detection
title: Retro - Baseline testing strategy with clean HEAD comparison prevents false regression detection
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T22:45:16.134Z"
updated: "2026-02-23T06:32:34.972Z"
tags:
  - retrospective
  - process
  - testing
  - tdd
  - project
severity: high
---

During the suggest-links scope consolidation refactor, comparing full test suite results against clean HEAD allowed proper distinction between pre-existing vs introduced failures. This prevented false alarms about regression. The session correctly identified all 10 post-change failures as pre-existing by running: git stash && bun run test:clean && git stash pop. This pattern is reliable and should be standard practice for validation phases.
