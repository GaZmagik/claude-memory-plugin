---
id: decision-accord-plugin-manual-meeting-skill-first-before-scheduled
title: "Accord plugin MVP: manual /meeting skill first, validate before scheduling"
type: decision
scope: project
created: "2026-01-30T17:24:30.589Z"
updated: "2026-01-30T17:24:30.589Z"
tags:
  - accord-plugin
  - architecture
  - v1.3.0
  - mvp-first
  - autonomous-agents
  - project
---

Instead of building full autonomous scheduled meeting infrastructure, MVP approach: (1) Phase 1 (v1.3.0): Ship manual /meeting skill with YAML meeting templates, spawns Task agents with defined roles, captures output to memory think. (2) Phase 2 (v1.3.1): Add event-driven triggers (pre-push quality gate, test failure retro, architecture drift check). (3) Phase 3 (v1.4.0): Scheduled meetings only if manual version proves >30% adoption. Rationale: Proves concept before heavy infrastructure investment, aligns with on-demand patterns of successful AI tools.
