---
id: gotcha-retro-external-file-discovery-scope-must-be-constrained-upfront-not-debugged-later
title: Retro - External file discovery scope must be constrained upfront, not debugged later
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-19T11:01:59.802Z"
updated: "2026-02-19T11:03:33.161Z"
tags:
  - retrospective
  - process
  - external-files
  - scope
  - project
severity: high
---

Phase 2B had discovery walk up to the real home directory using process.cwd(), finding unrelated files and breaking tests. The scope constraint fix (using basePath with parent walk limits) came late during debugging. Future pattern: Always constrain discovery paths explicitly at the start—use basePath and scope parameters, never rely on implicit cwd walking. Define discovery boundaries before writing tests, not after failures appear.
