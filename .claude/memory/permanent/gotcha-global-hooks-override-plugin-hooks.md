---
id: gotcha-global-hooks-override-plugin-hooks
title: Global hooks in ~/.claude/hooks/ can override or conflict with plugin hooks
type: gotcha
scope: project
created: "2026-01-18T11:05:42.352Z"
updated: "2026-01-18T11:05:42.352Z"
tags:
  - hooks
  - plugin
  - session-end
  - debugging
  - project
severity: high
---

When migrating hooks from global (~/.claude/hooks/) to plugin-based hooks, the old global hooks may still be active in settings.json. This causes:

1. Global hook runs instead of (or alongside) plugin hook
2. Global hook may use outdated skill names (e.g., /memory-commit vs /claude-memory-plugin:commit)
3. Spawned sessions don't have plugin skills available

**Symptoms:**
- 'Unknown skill: memory-commit' errors in logs
- Spawned session's skills list missing plugin skills
- Memory capture silently failing

**Fix:**
1. Check ~/.claude/settings.json for SessionEnd, PreCompact, etc. entries
2. Remove entries that reference old global hooks
3. Archive old hooks to ~/.claude/hooks/archive/

**Prevention:**
- When creating plugin hooks, always check for existing global hooks
- Use 'grep -r <hook-name> ~/.claude/' to find all references
