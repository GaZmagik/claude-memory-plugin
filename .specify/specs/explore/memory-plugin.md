# Exploration: Claude Code Memory Plugin

**Explored**: 2026-01-10
**Status**: Ready for specification (all decisions resolved)

## Feature Intent

Create a distributable Claude Code plugin that packages the existing memory skill system into a self-contained, installable plugin. The plugin will:

1. **Rewrite the memory skill in TypeScript** - modularise the current bash-based implementation
2. **Package all memory-related components** - skill, commands, agents, and hooks
3. **Support 4-tier scope hierarchy** - global, project, local, and enterprise memory storage
4. **Enable easy installation** - via marketplace or git URL

The goal is to make the sophisticated memory system accessible to other Claude Code users whilst maintaining the current functionality.

---

## Suggested Specify Prompt

```
Create a Claude Code plugin called "memory-plugin" that provides a comprehensive
knowledge management system for storing, retrieving, and linking memories across
Claude sessions.

The plugin MUST include:

1. **Memory Skill** (TypeScript rewrite):
   - CRUD operations: write, read, list, search, delete
   - Graph operations: link, unlink, edges, graph visualisation
   - Semantic search with embeddings
   - Quality scoring and health checking
   - Support for memory types: decisions, learnings, artifacts, gotchas, breadcrumbs
   - Hub-based navigation with memory loops

2. **Slash Commands**:
   - /check-memory-health - validate memory system integrity
   - /memory-commit - capture memories from conversation context
   - /memory - quick access to common operations

3. **Agents**:
   - memory-recall - efficient memory search specialist
   - memory-curator - health monitoring and quality assurance

4. **Hooks**:
   - protect-memory-directory (PreToolUse) - prevent direct file manipulation
   - memory-context (PostToolUse) - inject relevant gotchas when reading files
   - start-memory-index (SessionStart) - inject memory summary at session start
   - memory-skill-reminder (UserPromptSubmit) - suggest memory capture for edits

5. **4-Tier Scope Support**:
   - Global: ~/.claude/memory/ (personal, cross-project)
   - Project: .claude/memory/ (shared via git)
   - Local: .claude/memory/local/ (gitignored, personal project-specific)
   - Enterprise: managed-settings defined path (if available)

User stories prioritised by value:
- US1: Store and retrieve memories with YAML frontmatter
- US2: Search memories semantically using embeddings
- US3: Link memories into a navigable graph
- US4: Receive contextual gotcha warnings when reading code
- US5: Health monitoring and quality scoring
```

---

## Suggested Plan Prompt

```
Implement the memory-plugin using TypeScript with the following architecture:

**Technology Stack**:
- TypeScript for all skill logic (replacing bash scripts)
- Node.js runtime (Claude Code's native environment)
- Ollama integration for semantic search embeddings (graceful degradation if unavailable)
- JSON for graph storage (graph.json, index.json)
- Markdown with YAML frontmatter for memory files

**Embedding Provider Configuration**:

Config file location: `~/.claude/memory/config.json` (global) or `.claude/memory/config.json` (project)

```json
{
  "embedding": {
    "provider": "ollama",
    "endpoint": "http://localhost:11434",
    "model": "embeddinggemma",
    "fallbackModels": ["nomic-embed-text", "all-minilm"]
  }
}
```

Ollama detection strategy:
1. On semantic search request, check if Ollama is reachable at configured endpoint
2. If unreachable, fail gracefully with actionable error:
   ```
   Semantic search unavailable: Ollama not running at localhost:11434

   To enable semantic search:
   1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh
   2. Pull embedding model: ollama pull embeddinggemma
   3. Start Ollama: ollama serve

   Falling back to keyword search.
   ```
3. Cache Ollama availability status for session (don't check every request)
4. Auto-detect available embedding models and use first match from fallbackModels
5. Allow model override in config for user preference

**Plugin Structure** (per Claude Code plugin spec):
```
memory-plugin/
├── .claude-plugin/
│   └── plugin.json           # Plugin metadata
├── skills/
│   └── memory/
│       ├── SKILL.md          # Skill definition and triggers
│       ├── src/              # TypeScript source
│       │   ├── core/         # Core CRUD operations
│       │   ├── graph/        # Graph management
│       │   ├── search/       # Semantic search
│       │   ├── quality/      # Health and scoring
│       │   └── scope/        # 4-tier scope resolution
│       └── lib/              # Compiled JS (if needed)
├── commands/
│   ├── check-memory-health.md
│   ├── memory-commit.md
│   └── memory.md
├── agents/
│   ├── memory-recall.md
│   └── memory-curator.md
├── hooks/
│   ├── hooks.json            # Hook configuration
│   ├── protect-memory-directory.ts
│   ├── memory-context.ts
│   ├── start-memory-index.ts
│   └── memory-skill-reminder.ts
├── .mcp.json                 # Optional MCP server config
└── README.md
```

**Scope Resolution Logic**:
1. Check for enterprise managed-settings.json → use enterprise path if defined
2. Check for .claude/memory/local/ → personal project memories
3. Check for .claude/memory/ → shared project memories
4. Fall back to ~/.claude/memory/ → global memories

**Key Design Decisions**:
- Use YAML frontmatter for metadata (type, tags, links, timestamps)
- Store graph as adjacency list in graph.json
- Cache embeddings in .embedding-cache/ for performance
- Hooks written in TypeScript using Claude Code hook conventions
- Support both human-readable and JSON output formats

**Backward Compatibility** (no migration required):
- MUST read existing ~/.claude/memory/ files created by bash implementation
- MUST preserve YAML frontmatter format exactly
- MUST maintain graph.json and index.json structure
- New installations work immediately with existing memories
- No migration scripts or tooling needed
```

---

## Research Notes

### Existing Memory System (Found)

**Location**: `~/.claude/skills/memory/`

**Components Discovered**:
- **Main script**: `memory.sh` (7.4 KB dispatcher with 36+ commands)
- **Wrapper scripts**: `learnings.sh`, `decisions.sh`, `artifacts.sh`, `breadcrumbs.sh`, `hubs.sh`
- **Library modules**: `lib/core.sh`, `lib/health.sh`, `lib/mermaid.sh`, `lib/similarity.sh`, `lib/llm.sh`
- **Python utilities**: `lib/cosine_similarity.py`, `lib/semantic_search.py`, `lib/suggest_links.py`
- **38 command modules**: Full CRUD, graph, management, maintenance, quality, analysis operations

**Agents Found**:
- `memory-recall.md` (v2.0.0) - Resumable memory search specialist
- `memory-curator.md` (v1.0.0) - Health monitoring and quality assurance

**Commands Found**:
- `check-memory-health.md` (v2.0.0) - Memory system health validation
- `memory-commit.md` (v1.1.0) - Forked session memory capture

**Hooks Found** (14 TypeScript hooks):
- `protect-memory-directory.ts` - Blocks direct Write/Edit to .claude/memory/
- `memory-context.ts` - Context-aware gotcha injection (~600 lines)
- `start-memory-index.ts` - Session start memory summary
- `memory-skill-reminder.ts` - Suggests memory capture for edits
- Plus: `memory-context-bash.ts`, `clear-memory-check-flag.ts`, `pre-compact-memory.ts`, `end-memory.ts`, `memory-think-reminder.ts`

### Claude Code Plugin Structure (Researched)

**Required Structure**:
```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # REQUIRED: name, version, description, author
├── commands/                # Slash commands (*.md with frontmatter)
├── agents/                  # Agent definitions (*.md with frontmatter)
├── skills/                  # Skills (subdirs with SKILL.md)
├── hooks/                   # Event handlers (hooks.json + scripts)
├── .mcp.json               # Optional MCP server config
└── README.md               # REQUIRED: Documentation
```

**Command Frontmatter**:
```yaml
---
description: Short description for /help
argument-hint: <arg1> [optional-arg]
allowed-tools: [Read, Glob, Grep, Bash]
model: haiku  # Optional model override
---
```

**Skill Frontmatter**:
```yaml
---
name: skill-name
description: Trigger conditions for when Claude should use this skill
version: 1.0.0
---
```

**Agent Frontmatter**:
```yaml
---
name: agent-name
description: When to use this agent with examples
model: inherit
color: yellow
tools: ["Read", "Grep"]
---
```

**Hook Configuration** (hooks.json):
```json
{
  "hooks": {
    "PreToolUse": [{ "hooks": [{ "type": "command", "command": "...", "timeout": 10 }] }],
    "PostToolUse": [...],
    "SessionStart": [...],
    "UserPromptSubmit": [...]
  }
}
```

### Installation Methods (Researched)

**From Marketplace**:
```bash
/plugin marketplace add owner/repo-name
/plugin install plugin-name
```

**From Git URL**:
```bash
/plugin marketplace add https://github.com/owner/repo.git
```

**From Local Path**:
```bash
/plugin install ./path/to/plugin
```

**For Development**:
```bash
git clone https://github.com/owner/repo.git
/plugin install ./repo/plugin-name
```

### Enterprise Scope Feasibility (Researched)

**Findings**:
- Claude Code supports `managed-settings.json` for organisation-wide policy enforcement
- `allowManagedHooksOnly` setting restricts hook execution to managed hooks
- Enterprise paths would need to be defined in managed settings

**Recommendation**:
Enterprise scope is **feasible but optional**. Implementation approach:
1. Check for `managed-settings.json` presence
2. Look for `memory.enterprisePath` in managed settings
3. If not found, skip enterprise tier gracefully
4. Document enterprise setup in README for admins

**Risk**: Low - graceful degradation if enterprise not configured.

### Key Considerations

**Performance**:
- Embedding cache essential for semantic search performance
- Graph operations should be O(1) for single node lookups
- Index rebuilding should be incremental, not full rebuild

**Security**:
- Hooks MUST enforce memory skill usage (no direct file writes)
- Sensitive data should NOT be stored in memory system (no encryption - by design)
- Enterprise memories may have compliance requirements (admin responsibility)

**Complexity**:
- TypeScript rewrite is significant effort (~5000 lines of bash to port)
- Semantic search requires Ollama or similar (optional dependency)
- 4-tier scope adds complexity to path resolution

**Dependencies**:
- Node.js (bundled with Claude Code)
- Optional: Ollama for embeddings
- Optional: Python for legacy semantic search fallback

**Risks**:
- Breaking changes to memory file format
- Performance regression vs bash (unlikely but test)
- Enterprise integration may vary by organisation

---

## Resolved Decisions

### 1. Embedding Provider ✅

**Decision**: Use Ollama with graceful degradation and configurable preferences.

- Detect Ollama availability at configured endpoint (default: `localhost:11434`)
- If unavailable, fail semantic search gracefully with setup instructions
- Fall back to keyword search when embeddings unavailable
- Support multiple embedding models with auto-detection
- User configures preferred model in `config.json`
- Default model: `embeddinggemma`, fallbacks: `nomic-embed-text`, `all-minilm`

### 2. Migration Tooling ✅

**Decision**: No migration tooling required.

- Plugin MUST work seamlessly with existing bash-created memories
- Same file format, same directory structure, same graph.json/index.json
- Zero friction for existing users upgrading to the plugin

### 3. MCP Server ✅

**Decision**: Skill-first approach. MCP only for specific external integration use cases.

**Why skills are better for most operations**:
- Skills consume minimal context (just the SKILL.md trigger)
- Claude understands intent and can reason about memory relevance
- Semantic search requires understanding what user is looking for
- Memory operations benefit from Claude's contextual awareness

**MCP server MAY be useful for** (future consideration, not MVP):
| Operation | MCP Benefit | Priority |
|-----------|-------------|----------|
| `stats` | External dashboards/monitoring | Low |
| `list --json` | VS Code extension integration | Low |
| `health` | CI/CD health checks | Low |
| `export` | Backup automation | Low |

**Recommendation**: Do NOT include MCP server in initial release. Add later only if external tool integration demand emerges. The context cost of MCP outweighs benefits for Claude-driven operations.

### 4. Encryption ✅

**Decision**: No encryption support.

**Rationale**: Data sensitive enough to require encryption should not be stored in the memory system at all. The memory system is designed for shareable knowledge (decisions, patterns, gotchas), not secrets.

Users needing to store sensitive information should use:
- Environment variables
- Secret managers (1Password, Vault, etc.)
- Encrypted filesystems

---

## Sources

- [Claude Code Plugin Documentation](https://code.claude.com/docs/en/plugins)
- [Claude Code Settings Hierarchy](https://code.claude.com/docs/en/settings)
- [Claude Code Enterprise Controls](https://www.anthropic.com/news/claude-code-on-team-and-enterprise)
- [Anthropic Official Plugins](https://github.com/anthropics/claude-plugins-official)
- [Plugin Marketplace Guide](https://code.claude.com/docs/en/discover-plugins)
