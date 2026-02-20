---
id: learning-sanitise-agent-names-from-filesystem-discovery
title: Sanitise Agent Names from Filesystem Discovery
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-20T17:45:54.267Z"
updated: "2026-02-20T17:46:02.171Z"
tags:
  - security
  - sanitisation
  - injection-prevention
  - filesystem
  - project
---

When extracting agent names from filesystem directory listings, apply sanitiseAgentName() filter to prevent injection attacks. Directory names may contain malicious characters that bypass validation if not sanitised.
