---
id: gotcha-retro-agent-visibility-during-restoration-incomplete
title: Retro - Agent visibility during restoration incomplete
type: gotcha
scope: project
created: "2026-01-18T05:09:28.195Z"
updated: "2026-01-18T05:09:28.195Z"
tags:
  - retrospective
  - process
  - agents
  - coordination
  - project
severity: high
---

Three background agents launched before compaction appeared to still be 'running' during session restoration. Their actual progress was opaque—only checking typecheck count revealed most work was already done, but determining this took investigation. When spawning background work, ensure status/heartbeat files or explicit completion markers are written so main session doesn't wait for phantom progress.
