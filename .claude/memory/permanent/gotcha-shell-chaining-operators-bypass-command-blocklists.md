---
id: gotcha-shell-chaining-operators-bypass-command-blocklists
title: Shell chaining operators bypass command blocklists
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-27T19:21:04.095Z"
updated: "2026-02-27T19:22:08.278Z"
tags:
  - security
  - command-injection
  - shell
  - project
---

Shell operators like && || ; can chain allowlisted and destructive operations (chaining safe cmd with dangerous cmd). Must block compound operators at the hook level, not just individual command names. Applies to any bash command validation in tools or hooks.
