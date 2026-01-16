---
id: gotcha-retro-test-quality-audit-post-coverage-risks-releasing-cheating-tests
title: Retro - Test quality audit post-coverage risks releasing cheating tests
type: gotcha
scope: project
created: "2026-01-16T21:44:27.959Z"
updated: "2026-01-16T21:44:27.959Z"
tags:
  - retrospective
  - testing
  - quality-assurance
  - security
  - project
severity: critical
---

Discovered 6 cheating tests AFTER coverage push completed (3 placeholder tests with expect(true).toBe(true), 3 existence-only assertions). All discovered by test-quality-expert agent. Should run quality audit BEFORE coverage push starts, not after. Early discovery could've prevented integrating tests that pass without validating behaviour. Specifically: command injection and prototype pollution tests were completely empty.
