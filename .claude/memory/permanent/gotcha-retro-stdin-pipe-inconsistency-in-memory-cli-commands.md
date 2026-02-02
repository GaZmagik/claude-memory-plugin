---
id: gotcha-retro-stdin-pipe-inconsistency-in-memory-cli-commands
title: Retro - stdin pipe inconsistency in memory CLI commands
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-18T19:05:09.699Z"
updated: "2026-02-01T22:38:05.928Z"
tags:
  - retrospective
  - process
  - cli
  - stdin
  - project
severity: medium
---

Commands that take JSON stdin (memory write) have inconsistent behavior: `echo '{...}' | memory write` fails with 'No JSON input provided', but `cat file | memory write` works identically. Root cause appears to be stdin detection/buffering issue. Workaround: use file pipes or heredoc. Users will encounter this and need documentation or fix.
