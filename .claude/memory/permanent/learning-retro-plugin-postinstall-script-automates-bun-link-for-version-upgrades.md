---
id: learning-retro-plugin-postinstall-script-automates-bun-link-for-version-upgrades
title: Retro - Plugin postinstall script automates bun link for version upgrades
type: learning
scope: project
created: "2026-01-17T12:37:32.812Z"
updated: "2026-01-17T12:37:32.812Z"
tags:
  - retrospective
  - process
  - plugin-distribution
  - project
severity: medium
---

When plugin versions change (1.0.0 to 1.1.0), the installed path changes to a new versioned directory. Users must manually bun unlink/link from the new directory. Solution: Add postinstall script to package.json that runs bun link automatically. This makes version upgrades seamless - users just uninstall/reinstall and restart, no manual bun commands needed.
