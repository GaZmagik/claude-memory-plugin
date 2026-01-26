---
id: gotcha-missing-nodemodules-error-cannot-find-package-js-yaml
title: "Missing node_modules error: Cannot find package js-yaml"
type: gotcha
scope: project
created: "2026-01-26T22:52:49.246Z"
updated: "2026-01-26T22:52:49.246Z"
tags:
  - marketplace
  - error-message
  - debugging
  - v1.1.2
  - project
severity: medium
---

When marketplace plugin hooks fail silently, the actual error is: Cannot find package js-yaml (or other dependencies). This indicates node_modules is missing. The fix is to run bun install in the plugin directory. v1.1.2 adds auto-install in SessionStart hook.
