---
id: learning-help-text-auditing-revealed-missing-agent-flags-in-writeread-commands
title: Help text auditing revealed missing --agent flags in write/read commands
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T14:50:55.133Z"
updated: "2026-02-19T14:51:55.612Z"
tags:
  - help-text
  - documentation
  - audit
  - project
---

Systematic audit of command help text found write and read commands were missing documented --agent flag even though implementation supported it. Fixed by updating command-help.ts entries to match actual implementation.
