---
id: learning-retro-tdd-pre-tool-hooks-expose-edge-cases-earlier-in-design-phase
title: Retro - TDD pre-tool hooks expose edge cases earlier in design phase
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T18:26:38.442Z"
updated: "2026-02-23T18:28:04.390Z"
tags:
  - retrospective
  - process
  - tdd
  - architecture
  - project
severity: medium
---

The project's TDD enforcement hooks (refusing untested files) forced spec-first thinking before implementation. This prevented the deployment of a vulnerable shared temp file pattern (`/tmp/.claude-memory-plugin-last-agent-id`) that would have caused race conditions under simultaneous subagent termination. Process insight: strict TDD enforcement shifts bug discovery from implementation to design phase.
