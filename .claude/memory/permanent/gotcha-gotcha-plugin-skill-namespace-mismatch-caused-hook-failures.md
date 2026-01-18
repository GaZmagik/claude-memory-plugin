---
id: gotcha-gotcha-plugin-skill-namespace-mismatch-caused-hook-failures
title: Gotcha - Plugin skill namespace mismatch caused hook failures
type: gotcha
scope: project
created: "2026-01-17T06:11:57.861Z"
updated: "2026-01-17T06:11:57.861Z"
tags:
  - retrospective
  - hooks
  - plugin-system
  - project
severity: high
---

Hooks invoked `/memory:commit` but the command was registered as `/claude-memory-plugin:commit` in the plugin manifest. This wasn't a missing skill - it was registered under the wrong namespace. Wasted context on 'skill not found' errors before checking ~/.claude/plugins/installed_plugins.json. Always verify plugin registration name matches invocation in spawn-session calls.
