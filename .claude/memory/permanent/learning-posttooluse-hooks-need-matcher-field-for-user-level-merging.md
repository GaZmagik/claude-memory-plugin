---
id: learning-posttooluse-hooks-need-matcher-field-for-user-level-merging
title: PostToolUse hooks need matcher field for user-level merging
type: learning
scope: project
created: "2026-01-28T01:18:30.682Z"
updated: "2026-01-28T01:18:30.682Z"
tags:
  - hooks
  - matcher
  - hook-merging
  - plugin-configuration
  - project
---

Plugin PostToolUse hooks aren't auto-discovered for user-level hook merging. Adding `"matcher": "*"` to hooks.json explicitly enables merging with user's global hooks.
