---
id: gotcha-retro-plugin-reinstall-requires-proper-sequence-uninstall-install-from-marketplace
title: "Retro - Plugin reinstall requires proper sequence: uninstall → install from marketplace"
type: gotcha
scope: project
created: "2026-01-18T15:16:10.398Z"
updated: "2026-01-18T15:16:10.398Z"
tags:
  - retrospective
  - plugin
  - gotcha
  - project
severity: medium
---

Attempted bun link/unlink as plugin update mechanism - wrong. Correct sequence: (1) claude plugin uninstall <name>, (2) find marketplace with plugin, (3) claude plugin install <name>@<marketplace>. The local-memory-plugin marketplace was already configured. Bun link is only for package registry, not plugin management.
