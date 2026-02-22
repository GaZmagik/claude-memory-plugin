---
id: gotcha-retro-file-discovery-tests-must-use-isolated-temp-directories-not-oshomedir
title: Retro - File discovery tests must use isolated temp directories, not os.homedir()
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-19T09:52:57.035Z"
updated: "2026-02-19T11:03:33.041Z"
tags:
  - retrospective
  - process
  - testing
  - test-isolation
  - gotcha
  - project
severity: high
---

External file discovery tests initially used os.homedir() for homeDir parameter, causing tests to access real filesystem and find real CLAUDE.md files from user's actual home directory. This made tests non-deterministic and environment-dependent. Fix: Use beforeEach/afterEach to create isolated temp directories (fs.mkdtempSync, fs.rmSync). Pattern: Any file system tests should never reference os.homedir() or real project paths - always use isolated temporary fixtures. This prevents test pollution and ensures tests pass consistently across different developer machines.
