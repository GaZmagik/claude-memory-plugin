---
id: gotcha-command-injection-via-unsanitized-agent-names-in-prompts-and-shell-commands
title: Command injection via unsanitized agent names in prompts and shell commands
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T20:53:03.816Z"
updated: "2026-02-23T20:53:31.642Z"
tags:
  - security
  - command-injection
  - agent-names
  - pr-043
  - project
---

Agent names and reasons interpolated into prompt strings or shell commands without sanitisation allow command injection. Both agentName and reason variables must be sanitised (remove special chars) before any interpolation. Discovered during PR #43 review of subagent-registry changes.
