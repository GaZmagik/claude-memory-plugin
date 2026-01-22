---
id: gotcha-retro-sandbox-git-config-writes-fail-but-dont-block-operations
title: Retro - Sandbox git config writes fail but don't block operations
type: gotcha
scope: project
created: "2026-01-22T08:24:52.596Z"
updated: "2026-01-22T08:24:52.596Z"
tags:
  - retrospective
  - process
  - sandbox
  - git
  - project
severity: low
---

When using git in sandboxed environments, writes to .git/config fail with 'Device or resource busy' errors. However, the actual git operations (push, pull, branch creation) complete successfully. The errors are misleading - don't treat them as failures. Watch for successful operation output (branch created, remote updated) rather than relying on exit codes.
