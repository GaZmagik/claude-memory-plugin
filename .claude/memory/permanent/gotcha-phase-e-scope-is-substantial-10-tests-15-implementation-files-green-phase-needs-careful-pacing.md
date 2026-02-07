---
id: gotcha-phase-e-scope-is-substantial-10-tests-15-implementation-files-green-phase-needs-careful-pacing
title: Gotcha - Phase E scope is substantial (10 tests + ~15 implementation files); Green phase needs careful pacing
type: gotcha
scope: project
created: "2026-02-05T13:31:33.539Z"
updated: "2026-02-05T13:31:33.539Z"
tags:
  - retrospective
  - process
  - phase-planning
  - phase-e
  - project
severity: medium
---

Phase E includes 10 comprehensive test files (T103-T112) covering scope indicators, Mermaid styling, AgentInfo, agent scanning, mermaid integration, stats, health, agents command, and suggest-links. The corresponding 15+ implementation files (T113-T126) represent significant work. Risk: attempting to implement all files in one session could lead to getting stuck, incomplete implementations, or test skipping. Future sessions should break Green phase into 2-3 logical sub-phases (utilities → CLI commands → integration) and validate each sub-phase before proceeding.
