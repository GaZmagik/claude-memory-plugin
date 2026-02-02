---
id: gotcha-path-traversal-validation-required-for-user-supplied-agentstyle-names
title: Path traversal validation required for user-supplied agent/style names
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-25T21:18:43.409Z"
updated: "2026-02-01T22:38:06.596Z"
tags:
  - security
  - validation
  - input-sanitisation
  - project
---

User input for --agent and --style flags must be sanitised before file discovery to prevent path traversal attacks. Direct comparison against discovered filenames without validation allows malicious input like '../../../etc/passwd' to be processed.
