---
id: gotcha-exactoptionalpropertytypes-typescript-flag-causes-407-compilation-errors
title: exactOptionalPropertyTypes TypeScript flag causes 407 compilation errors
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-27T21:33:02.198Z"
updated: "2026-02-28T09:20:43.090Z"
tags:
  - typescript
  - type-system
  - tsconfig
  - breaking-change
  - project
---

Enabling exactOptionalPropertyTypes in tsconfig.json produces 407 compilation errors across the codebase. Despite sounding like a small lint improvement, it is a project-wide type system overhaul requiring dedicated PR.
