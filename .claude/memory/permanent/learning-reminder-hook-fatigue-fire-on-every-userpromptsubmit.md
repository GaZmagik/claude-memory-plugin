---
id: learning-reminder-hook-fatigue-fire-on-every-userpromptsubmit
title: Reminder hook fatigue - fire on every UserPromptSubmit
type: learning
scope: project
created: "2026-01-28T01:18:32.165Z"
updated: "2026-01-28T01:18:32.165Z"
tags:
  - hooks
  - user-experience
  - reminders
  - session-cache
  - project
---

Memory skill and memory think reminders fire on every UserPromptSubmit in v1.1.2, causing reminder fatigue. Session-cache pattern can track shown reminders and suppress repeats. Reset occurs naturally at session compaction (new session ID).
