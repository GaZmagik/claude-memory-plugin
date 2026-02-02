---
id: learning-retro-backwards-compatibility-via-field-derivation-prevents-cascade-breakage
title: Retro - Backwards compatibility via field derivation prevents cascade breakage
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-17T23:06:37.742Z"
updated: "2026-02-01T22:38:06.684Z"
tags:
  - retrospective
  - process
  - backwards-compatibility
  - project
severity: medium
---

When legacy documents miss required fields (e.g., old think docs without topic/status), deriving values from related fields (title→topic, tags→status, last_thought_type→status) handles compatibility gracefully. Applied to think frontmatter parser. Prevents breakage for all existing users without manual migrations.
