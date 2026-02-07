---
id: gotcha-meeting-command-10-agent-limit-and-timeouts-prevent-runaway-costs
title: "Meeting command: 10 agent limit and timeouts prevent runaway costs"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-31T07:38:29.017Z"
updated: "2026-02-01T22:38:06.501Z"
tags:
  - meeting-command
  - cost-control
  - api-limits
  - v1.3.0
  - security
  - project
severity: high
---

Multi-agent meetings risk runaway API costs. MUST implement: (1) Hard 10-agent limit in schema, (2) 2min timeout per agent, (3) haiku model only, (4) Promise.allSettled() for graceful degradation. Worst case: 10×2min×haiku = ~£0.10/meeting. Without limits: 50 agents could cost £5+. Enforce in Zod schema validation and orchestrator.
