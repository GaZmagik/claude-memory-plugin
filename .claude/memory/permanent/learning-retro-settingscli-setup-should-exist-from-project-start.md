---
id: learning-retro-settingscli-setup-should-exist-from-project-start
title: Retro - Settings/CLI setup should exist from project start
type: learning
scope: project
created: "2026-01-18T05:43:57.555Z"
updated: "2026-01-18T05:43:57.555Z"
tags:
  - retrospective
  - process
  - devex
  - project
severity: low
---

During this session, realized settings documentation (memory.example.md) existed but there was no `memory setup` command to initialize memory.local.md. Had to add this manually. Lesson: Developer experience tooling (setup wizards, init commands, environment configuration) should be in place before the codebase reaches 600+ TypeScript files. Harder to retrofit later.
