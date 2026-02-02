---
id: learning-retro-direct-cli-execution-validates-feature-before-plugin-rebuild
title: Retro - Direct CLI execution validates feature before plugin rebuild
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-26T14:25:09.950Z"
updated: "2026-02-01T22:38:06.964Z"
tags:
  - retrospective
  - process
  - testing
  - cli
  - project
severity: medium
---

When testing features that require plugin infrastructure (like provider routing), running the CLI directly with bun bypasses the build step. Use: bun ./skills/memory/src/cli.ts <command>. This enabled real end-to-end testing of --call codex and --call gemini routing without waiting for dist builds or npm reinstall. Faster feedback cycle for integration-level changes.
