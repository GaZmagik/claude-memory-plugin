---
id: gotcha-phase-b-test-file-mocks-must-mirror-beforeeach-setup-across-all-test-blocks
title: Phase B Test File Mocks Must Mirror beforeEach Setup Across All Test Blocks
type: gotcha
scope: project
created: "2026-02-03T20:44:25.295Z"
updated: "2026-02-03T20:44:25.295Z"
tags:
  - bun
  - testing
  - phase-b
  - agent-scoped
  - fs-mocking
  - project
---

Bun test framework does not persist mock state between individual test blocks. Each test block with custom mocks must also mock all fs operations (fsp.access, fsp.readFile, fs.existsSync, fs.readFileSync, etc.) that the function uses. Missing mocks in any single test block cause EACCES errors even if beforeEach sets up mocks. Solution: replicate beforeEach fs mock setup in every test that needs custom file content.
