---
id: learning-cli-sub-command-routing-via-dispatcher-functions
title: CLI sub-command routing via dispatcher functions
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T18:04:03.594Z"
updated: "2026-02-16T22:30:07.343Z"
tags:
  - cli
  - routing
  - commands
  - dispatcher
  - project
---

Commands like 'agents' with sub-commands (list, stats) are implemented using dispatcher functions that parse sub-command arguments and route to handlers. Pattern mirrors existing 'think' command: main dispatcher extracts sub-command name, validates it, calls appropriate handler with remaining args.
