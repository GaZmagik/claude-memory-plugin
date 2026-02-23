---
id: learning-retro-spec-file-refactoring-timing
title: Retro - Spec file refactoring timing
type: learning
scope: project
created: "2026-02-23T14:49:28.673Z"
updated: "2026-02-23T14:49:28.673Z"
tags:
  - retrospective
  - process
  - code-organization
  - project
severity: low
---

Test file splitting should happen earlier when file size exceeds ~250 lines rather than waiting until >500 lines. Early split keeps cognitive load lower and makes change scope clearer. For suggest-links.spec.ts, LLM-type tests should have been extracted into suggest-links-llm.spec.ts before security tests were added.
