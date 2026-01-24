---
id: learning-secret-name-consistency-in-github-actions-workflows
title: Secret name consistency in GitHub Actions workflows
type: learning
scope: project
created: "2026-01-24T14:15:13.132Z"
updated: "2026-01-24T14:15:13.132Z"
tags:
  - github-actions
  - secrets
  - authentication
  - project
---

GitHub Actions workflows must use correct secret names. claude-code-action expects CLAUDE_CODE_OAUTH_TOKEN, not ANTHROPIC_API_KEY. Mismatched secret names cause silent workflow failures with authentication errors.
