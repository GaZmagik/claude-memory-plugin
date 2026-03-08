---
id: gotcha-retro-summary-md-files-violate-claudemd-guidance-despite-presentation-in-session
title: Retro - Summary .md files violate CLAUDE.md guidance despite presentation in-session
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-03-08T04:33:08.009Z"
updated: "2026-03-08T04:33:24.333Z"
tags:
  - retrospective
  - process
  - documentation
  - guidelines
  - project
severity: medium
---

Created review-report-2026-03-08T01-23-39Z.md file to store review findings. However, CLAUDE.md explicitly states: avoid writing summary markdown documents, present findings in messages instead. The findings *were* presented inline during the session, so the file was redundant. Apply the rule: if findings are already presented conversationally, skip the summary file. Use memory skill for documentation instead.
