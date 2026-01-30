---
id: artifact-settings-version-detection-and-migration
title: Settings version detection and auto-migration logic
type: artifact
scope: project
created: "2026-01-30T17:24:25.903Z"
updated: "2026-01-30T17:24:25.903Z"
tags:
  - settings-management
  - v1.2.0
  - migration
  - auto-sync
  - project
---

Implemented checkAndMigrateSettingsVersion() in plugin-settings.ts that: (1) Compares user's settings_version to DEFAULT_SETTINGS.settings_version, (2) Auto-regenerates memory.example.md from hooks/memory.example.md template when outdated, (3) Shows notification listing new settings available (e.g. 'New settings: reminder_count, skip_hooks_after_clear'). Integrated into SessionStart hook to execute on every session. Handles missing template files gracefully. Test coverage: 29/29 tests pass.
