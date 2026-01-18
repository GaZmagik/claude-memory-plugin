---
id: gotcha-retro-plugin-code-changes-require-reinstall-when-version-unchanged
title: Retro - Plugin code changes require reinstall when version unchanged
type: gotcha
scope: project
created: "2026-01-18T01:29:46.792Z"
updated: "2026-01-18T01:29:46.792Z"
tags:
  - retrospective
  - plugin
  - gotcha
  - development
  - project
severity: high
---

Updated code in a plugin (spawn-session.ts security fixes) but version stayed 1.0.0. Result: `claude plugin update` reported 'already at latest' even though code had changed. Solution: Use `claude plugin uninstall` + `claude plugin install` to force cache refresh when version number doesn't change.
