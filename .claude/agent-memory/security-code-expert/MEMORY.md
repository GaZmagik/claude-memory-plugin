# Security Code Expert - Memory

## Project: claude-memory-plugin
- TypeScript plugin for Claude Code with Bun runtime
- Core source: skills/memory/src/ (CLI, CRUD, graph, search, think/AI)
- Hooks: hooks/ and hooks/src/ (lifecycle hooks, Ollama, subprocess)
- Uses execFileSync/spawnSync (safe from shell injection by design)
- Has path traversal protections: isInsideDir, isValidExternalPath, null byte check
- Has agent name sanitisation + validation with reserved name blocklist
- Has symlink validation (validateSymlinkTarget)
- Import module has prototype pollution protection (sanitiseObject)
- YAML import uses js-yaml JSON_SCHEMA (safe schema)
- spawn-session.ts uses wrapper script with file-based arg passing to avoid injection

## Key Security Patterns Observed
- execFileSync used instead of exec (prevents shell injection)
- Atomic file writes via temp-then-rename pattern
- Output buffer limits (10MB in subprocess, 2MB in AI invoke)
- Timeout enforcement on all subprocess and network calls
- Error message sanitisation to redact home directory paths
- Model name sanitisation in provider commands
- Shell metacharacter validation in spawn-session (validateShellSafe, validatePathSafe)

## Audit Findings (2026-02-26)
- See security-audit-findings.md for detailed report
