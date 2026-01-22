---
id: learning-retro-https-git-remote-resolves-sandbox-ssh-restrictions
title: Retro - HTTPS git remote resolves sandbox SSH restrictions
type: learning
scope: project
created: "2026-01-22T08:24:38.543Z"
updated: "2026-01-22T08:24:38.543Z"
tags:
  - retrospective
  - process
  - sandbox
  - git
  - project
severity: medium
---

When working in sandboxed Claude environments, SSH connections to GitHub fail due to network restrictions. Switching the git remote to HTTPS (git remote set-url origin https://github.com/...) works reliably and allows all git operations to proceed. This should be the default approach for sandboxed sessions rather than attempting SSH.
