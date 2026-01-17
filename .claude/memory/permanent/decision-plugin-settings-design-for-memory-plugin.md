---
id: decision-plugin-settings-design-for-memory-plugin
title: Plugin Settings Design for Memory Plugin
type: decision
scope: project
created: "2026-01-17T11:16:54.573Z"
updated: "2026-01-17T11:16:54.573Z"
tags:
  - promoted-from-think
  - project
---

# Plugin Settings Design for Memory Plugin

Decision: Implement plugin settings via .claude/memory.local.md with tiered configuration.

FILE FORMAT:
- YAML frontmatter + markdown body (per Claude Code pattern)
- File: .claude/memory.local.md
- Add to .gitignore template

TIER 1 SETTINGS (Exposed):
- enabled: boolean (default: true) - master switch
- ollama_host: string (default: http://localhost:11434)
- chat_model: string (default: gemma3:4b)
- embedding_model: string (default: embeddinggemma:latest)
- context_window: number (default: 16384)

TIER 2 SETTINGS (Advanced, documented):
- health_threshold: number (default: 0.7) - graph health warning
- semantic_threshold: number (default: 0.45) - similarity cutoff
- auto_sync: boolean (default: false) - sync on startup

IMPLEMENTATION:
1. Create settings-parser.ts utility to parse YAML frontmatter
2. Update hooks to read settings with fallback chain
3. Create memory.example.md template
4. Document in plugin README

ERROR HANDLING:
- Missing file → use plugin defaults (zero-config happy path)
- Parse error → log warning, use defaults
- Invalid value → log warning, use default for that setting
- Ollama unavailable → graceful degradation (already handled)

_Deliberation: `thought-20260117-110940893`_
