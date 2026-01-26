---
id: artifact-spec-remediation-pattern-analyze-decide-add-fr-add-test
title: "Spec remediation pattern: analyze → decide → FR → test"
type: artifact
scope: project
created: "2026-01-24T23:43:26.020Z"
updated: "2026-01-24T23:43:26.020Z"
tags:
  - speckit
  - pattern
  - remediation
  - analysis
  - quality-gates
  - project
---

Pattern for resolving spec ambiguities identified by /speckit:analyze: (1) Run /speckit:analyze to identify NEEDS CLARIFICATION markers, (2) Make explicit decision (timeout value, output handling, etc), (3) Add new FR or update existing requirement, (4) Add corresponding test task, (5) Update research.md with decision rationale, (6) Mark checklist items complete. Applied to v1.1.0: resolved 30s provider CLI timeout (FR-045), clarified stdout/stderr handling (NFR-010), added session state performance test (T091b).
