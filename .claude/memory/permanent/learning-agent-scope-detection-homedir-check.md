---
id: learning-agent-scope-detection-homedir-check
title: Agent scope detection requires os.homedir() check, not path.includes()
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-07T15:36:39.506Z"
updated: "2026-02-16T22:30:07.483Z"
tags:
  - agent-scopes
  - path-detection
  - scope-resolver
  - getAgentInfo
  - project
---

The getAgentInfo function had broken scope detection: using path.includes('/.claude/memory/agents/') matched both project and global agent paths. Fixed by checking if path starts with os.homedir() to identify global agents. Without this, /home/user/.claude/memory/agents/rust-expert was incorrectly classified as project scope.
