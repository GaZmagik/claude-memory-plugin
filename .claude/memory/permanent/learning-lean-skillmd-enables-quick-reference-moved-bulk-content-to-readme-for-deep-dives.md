---
id: learning-lean-skillmd-enables-quick-reference-moved-bulk-content-to-readme-for-deep-dives
title: Lean SKILL.md enables quick reference - moved bulk content to README for deep dives
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T21:05:38.847Z"
updated: "2026-01-16T23:10:42.460Z"
tags:
  - documentation
  - user-experience
  - retro
  - project
---

# Lean SKILL.md for AI Trigger Detection

## Insight
Shrinking SKILL.md from 432 → 102 lines (76% reduction) while moving comprehensive content to README created better separation of concerns for AI skill invocation.

## Pattern
**SKILL.md** (102 lines - lean):
- Metadata (name, description, version)
- Purpose & When to Invoke (critical for AI trigger detection)
- Usage (how to call)
- Command Reference table (quick lookup)
- Link to README for details

**README.md** (479 lines - comprehensive):
- Installation & Quick Start
- Full Architecture
- Data Contract & Storage Layout
- Quality Assessment system
- Thinking Sessions workflow
- Advanced features & troubleshooting

## Benefits
1. **AI Trigger Detection**: SKILL.md's "When to Invoke" section is now prominent and focused - easier for AI to detect when skill should be used
2. **Quick Reference**: Users/agents can get command list and usage without scrolling through 400+ lines
3. **Progressive Disclosure**: Interested users find comprehensive docs in README; casual users get what they need in SKILL.md
4. **Maintenance**: Keeping SKILL.md small = easier to update trigger patterns and usage

## What Worked
- Command Reference table format (50 lines, high info density)
- Separate GitHub links instead of embedding examples
- "See README for..." pattern for organizing depth

## File Statistics
Before: SKILL.md 432 lines (hard to scan)
After: SKILL.md 102 lines (scans in ~30 seconds)
README: 479 lines (organized by feature)

Total: +45 lines net, but better organized for both quick and deep use cases.
