---
id: gotcha-retro-global-hooks-can-silently-override-plugin-hooks-if-not-removed-from-settings
title: Retro - Global hooks can silently override plugin hooks if not removed from settings
type: gotcha
scope: project
created: "2026-01-18T11:40:25.920Z"
updated: "2026-01-18T11:40:25.920Z"
tags:
  - retrospective
  - process
  - hooks
  - debugging
  - settings
  - project
severity: high
---

When migrating from global hooks (~/.claude/hooks/) to plugin-based hooks, old entries in ~/.claude/settings.json remain active and override or conflict with plugin hooks. The 'Unknown skill: memory-commit' error was traced to a global SessionEnd hook still registered in settings.json, invoking an old un-namespaced skill. Prevention: Always check settings.json for legacy hook entries when debugging mysterious skill failures. Consider linting to prevent this recurrence.
