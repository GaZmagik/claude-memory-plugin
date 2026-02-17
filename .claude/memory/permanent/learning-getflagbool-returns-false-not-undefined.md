---
id: learning-getflagbool-returns-false-not-undefined
title: getFlagBool Returns False Not Undefined
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T01:37:20.608Z"
updated: "2026-02-16T22:30:07.541Z"
tags:
  - cli
  - flags
  - helpers
  - gotcha
  - project
---

The getFlagBool helper returns false (not undefined) for absent flags. This breaks optional chaining patterns like (getFlagBool(...) ?? true). Must use explicit false checks instead.
