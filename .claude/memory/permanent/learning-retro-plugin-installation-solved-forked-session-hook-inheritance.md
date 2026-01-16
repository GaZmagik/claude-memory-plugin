---
id: learning-retro-plugin-installation-solved-forked-session-hook-inheritance
title: Retro - Plugin installation solved forked session hook inheritance
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-16T14:41:51.767Z"
updated: "2026-01-16T14:51:40.657Z"
tags:
  - retrospective
  - process
  - architecture
  - plugin-system
  - project
severity: high
---

Installing the memory plugin globally via local marketplace fixed forked sessions not inheriting hooks. Strategic architectural decision: one plugin installation resolved multiple downstream issues (protection hooks, sed/awk blockers, hook availability in spawned Claude processes). Lesson: when multiple problems trace to a common root, solve the root rather than working around each symptom.
