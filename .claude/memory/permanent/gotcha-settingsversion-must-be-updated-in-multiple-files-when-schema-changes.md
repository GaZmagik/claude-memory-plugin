---
id: gotcha-settingsversion-must-be-updated-in-multiple-files-when-schema-changes
title: settings_version must be updated in multiple files when schema changes
type: gotcha
scope: project
created: "2026-01-28T22:20:02.493Z"
updated: "2026-01-28T22:20:02.493Z"
tags:
  - settings
  - versioning
  - yaml-frontmatter
  - sync-required
  - project
---

When bumping settings_version (e.g., 1 → 2), update ALL of these files:

1. hooks/src/settings/plugin-settings.ts:
   - DEFAULT_SETTINGS.settings_version
   - Validation logic if needed

2. hooks/memory.example.md:
   - YAML frontmatter: settings_version: 1
   - Documentation table with new version

3. .claude/memory.example.md:
   - YAML frontmatter: settings_version: 1
   - Documentation table with new version

4. .claude/memory.local.md:
   - YAML frontmatter: settings_version: 1

5. CHANGELOG.md:
   - Document what changed in the new schema version

Missing any of these creates inconsistency where hooks use one version but templates show another.

Similar to scope field serialisation gotcha - multi-file sync required.
