---
id: learning-agent-identity-detection-via-invocation-markers-practical-implementation-approach
title: Agent identity detection via invocation markers - practical implementation approach
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T07:29:53.541Z"
updated: "2026-02-16T22:30:07.498Z"
tags:
  - agent-scoping
  - identity-detection
  - implementation-strategy
  - project
---

Documented three viable detection mechanisms: env vars (MVP), hook metadata (best long-term), and invocation markers in prompts. Recommended 3-phase implementation with priority resolution algorithm. Env var approach is simplest for Phase 1, hook metadata integration deferred to Phase 2+ when Claude Code provides extension points.
