---
id: gotcha-retro-tool-configuration-defaults-can-create-friction-with-project-layouts
title: Retro - Tool configuration defaults can create friction with project layouts
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T12:30:47.866Z"
updated: "2026-02-23T12:31:02.984Z"
tags:
  - retrospective
  - process
  - tooling
  - project
severity: medium
---

Tools like tdd-parity have hardcoded default paths (e.g., src/ → tests/unit/) that don't match all project structures. When a project uses colocated tests (tests alongside source in src/), the tool requires explicit flag overrides (--src src/ --tests src/). This required debugging through multiple tool invocations to discover the correct configuration. Consider: checking .tddparity.json early, or auto-detecting colocated test patterns.
