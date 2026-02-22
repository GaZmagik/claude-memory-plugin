---
id: learning-version-bumps-require-updates-across-packagejson-pluginjson-and-changelogmd
title: Version bumps require updates across package.json, plugin.json, and CHANGELOG.md
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T06:32:44.899Z"
updated: "2026-02-19T06:33:18.840Z"
tags:
  - versioning
  - release-process
  - maintenance
  - project
---

Hotfix v1.5.1 required synchronising version strings across three files: package.json, .claude-plugin/plugin.json, and CHANGELOG.md with dated entries. Missing any file leaves the codebase in an inconsistent state. Automated checks (CI) should validate version parity across these files.
