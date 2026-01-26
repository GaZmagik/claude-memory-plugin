---
id: learning-marketplace-plugin-install-location-discovery
title: Marketplace plugin install location discovery
type: learning
scope: project
created: "2026-01-26T22:53:33.703Z"
updated: "2026-01-26T22:53:33.703Z"
tags:
  - marketplace
  - plugin
  - debugging
  - v1.1.2
  - project
---

Marketplace-installed plugins are extracted to ~/.claude/plugins/cache/enhance/<plugin-name>/<version>/. This path is important for debugging - changes to local dev code do NOT affect installed plugins. Must patch the marketplace location directly for testing, or reinstall from marketplace after publishing.
