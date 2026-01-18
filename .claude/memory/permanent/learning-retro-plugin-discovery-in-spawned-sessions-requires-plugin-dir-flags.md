---
id: learning-retro-plugin-discovery-in-spawned-sessions-requires-plugin-dir-flags
title: Retro - Plugin discovery in spawned sessions requires plugin-dir flags
type: learning
scope: project
created: "2026-01-17T13:36:44.335Z"
updated: "2026-01-17T13:36:44.335Z"
tags:
  - retrospective
  - plugins
  - spawned-sessions
  - infrastructure
  - project
severity: medium
---

Discovered that spawning fresh Claude sessions with --print does not automatically load plugins. Solution: Query ~/.claude/plugins/installed_plugins.json to find installed plugins, then pass --plugin-dir flags to claude CLI in wrapper script. This enables spawned sessions to access plugin commands/skills. Applied to spawn-session.ts with findPluginDir() helper function.
