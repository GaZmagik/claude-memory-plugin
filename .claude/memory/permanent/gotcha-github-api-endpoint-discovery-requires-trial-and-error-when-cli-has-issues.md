---
id: gotcha-github-api-endpoint-discovery-requires-trial-and-error-when-cli-has-issues
title: "Gotcha: GitHub API endpoint discovery requires trial-and-error when CLI has issues"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-22T16:51:38.331Z"
updated: "2026-02-22T16:52:10.667Z"
tags:
  - retrospective
  - process
  - github-api
  - troubleshooting
  - project
severity: medium
---

Session encountered multiple failures when fetching PR comments: 'gh pr view' had GraphQL deprecation warnings, 'gh api repos/garethlockwood/...' returned 'Not Found', but 'gh api repos/GaZmagik/...' eventually worked. The issue was that the git remote URL used 'GaZmagik' but initial queries used 'garethlockwood'. When gh CLI commands fail with vague errors (GraphQL deprecation, Not Found), verify the exact owner name from 'git remote -v' before assuming the endpoint is wrong. Also, different gh subcommands may fail gracefully while API calls fail hard.
