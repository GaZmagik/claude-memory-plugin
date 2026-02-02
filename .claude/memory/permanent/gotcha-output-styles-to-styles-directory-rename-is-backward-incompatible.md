---
id: gotcha-output-styles-to-styles-directory-rename-is-backward-incompatible
title: output-styles to styles directory rename is backward-incompatible
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-24T14:15:05.885Z"
updated: "2026-02-01T22:38:06.189Z"
tags:
  - plugin-schema
  - backward-compatibility
  - breaking-changes
  - project
---

Renaming output-styles/ to styles/ per plugin.json schema breaks users with custom styles in ~/.claude/output-styles/. Global discovery must maintain backward compatibility by checking both paths, or breaking change must be clearly documented.
