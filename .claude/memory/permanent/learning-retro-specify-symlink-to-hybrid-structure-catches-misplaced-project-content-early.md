---
id: learning-retro-specify-symlink-to-hybrid-structure-catches-misplaced-project-content-early
title: Retro - .specify symlink-to-hybrid-structure catches misplaced project content early
type: learning
scope: project
created: "2026-01-18T18:12:12.589Z"
updated: "2026-01-18T18:12:12.589Z"
tags:
  - retrospective
  - process
  - structure
  - project
severity: medium
---

User caught mid-session that .specify was a full symlink (making project specs live in ~/.specify instead of repo). Restructuring to symlink framework files only + track project content as real directories was clean and prevented future confusion. Early detection of structural issues pays off.
