---
id: learning-marketplace-plugin-hooks-fail-silently-without-nodemodules
title: Marketplace plugin hooks fail silently without node_modules
type: learning
scope: project
created: "2026-01-28T01:18:30.206Z"
updated: "2026-01-28T01:18:30.206Z"
tags:
  - hooks
  - marketplace
  - node_modules
  - plugin-installation
  - project
---

When plugins are installed via marketplace, they lack node_modules. Hooks don't execute and fail silently (no error output). SessionStart must auto-run `bun install` to ensure dependencies are available before hooks fire.
