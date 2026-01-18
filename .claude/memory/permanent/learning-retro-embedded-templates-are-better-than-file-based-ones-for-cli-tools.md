---
id: learning-retro-embedded-templates-are-better-than-file-based-ones-for-cli-tools
title: Retro - Embedded templates are better than file-based ones for CLI tools
type: learning
scope: project
created: "2026-01-18T22:46:30.645Z"
updated: "2026-01-18T22:46:30.645Z"
tags:
  - retrospective
  - cli-design
  - configuration
  - project
severity: medium
---

The memory setup command initially looked for .claude/memory.example.md in the current directory, failing in projects without the file. Fixed by embedding the template as a constant. Lesson: For CLI tools meant to work anywhere, embed configuration templates rather than requiring external files. Improves user experience and reduces setup friction.
