---
id: gotcha-retro-marketplace-plugin-lacks-nodemodules-breaks-for-users
title: Retro - Marketplace plugin lacks node_modules - breaks for users
type: gotcha
scope: project
created: "2026-01-26T22:33:27.522Z"
updated: "2026-01-26T22:33:27.522Z"
tags:
  - retrospective
  - marketplace
  - v1.1.2
  - project
severity: high
---

Marketplace-installed plugin at ~/.claude/plugins/cache/.../1.1.1 has no node_modules. PostToolUse hooks fail silently with js-yaml not found. SessionStart needs to check for missing node_modules and run bun install. This is a v1.1.2 fix.
