---
id: gotcha-context-budget-reached-at-100-should-have-launched-agents-earlier
title: Gotcha - Context budget reached at 100%, should have launched agents earlier
type: gotcha
scope: project
created: "2026-01-26T00:12:08.737Z"
updated: "2026-01-26T00:12:08.737Z"
tags:
  - retrospective
  - process
  - context-management
  - agents
  - project
severity: high
---

During this session, context hit 100% partway through work. At that point we launched multiple subagents in background. Looking back, we should have launched agents (typescript-expert, test-quality-expert) earlier when we identified work that needed delegation, rather than waiting until context was critically low. Future approach: When delegating 2+ hours of work, launch agents immediately rather than trying to do context-heavy analysis first. Each agent has independent budget.
