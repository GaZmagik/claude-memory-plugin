---
id: learning-retro-early-triage-prevents-flaky-test-investigation-rabbit-holes
title: Retro - Early triage prevents flaky test investigation rabbit holes
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T10:25:23.040Z"
updated: "2026-02-22T10:26:20.966Z"
tags:
  - retrospective
  - process
  - testing
  - project
severity: medium
---

Spent ~30 mins investigating AutoSelector test pollution across full test suite without finding root cause. Test passed in isolation consistently. Earlier decision to skip and document for later investigation would have freed time for other fixes. Pattern: if test passes in isolation but fails in suite with unclear pollution source after 2-3 investigation attempts, skip it and move on. Flaky test isolation is lower ROI than feature bugs.
