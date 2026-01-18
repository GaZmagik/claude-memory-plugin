---
description: Check memory system health including graph connectivity, hub integrity, frontmatter sync, and link suggestions.
argument-hint: "[--user | --project | --local | --all] [--quick]"
version: "3.1.0"
---

## User Input

```text
$ARGUMENTS
```

## Goal

Perform a health check of the memory system using the built-in `memory validate` command. Supports all 4 scope levels: User, Project, Local, and Enterprise.

## Prerequisites

**CRITICAL**: Before running any memory commands, you MUST activate the memory skill first using the Skill tool:

```
Skill: memory
```

This ensures the skill is loaded and the `memory` CLI command is available (installed via `bun link`). Without this step, the commands below may not work correctly.

## Execution Steps

### 1. Determine Scope

**Check arguments first**:
- `--user` or `--global` or `user` or `global` → Use `user` scope
- `--project` or `project` → Use `project` scope
- `--local` or `local` → Use `local` scope
- `--enterprise` or `enterprise` → Use `enterprise` scope (for managed environments)
- `--all` or `all` → Check all accessible scopes sequentially
- `quick` or `--quick` → Quick check mode (can combine with any scope)

**Note**: `--global` is accepted as a legacy alias for `--user`.

**If no scope provided**, first check which scopes are accessible:

```bash
# Check enterprise scope availability (for managed environments)
memory config get scopes.enterprise.enabled 2>/dev/null | jq -r '.data // false'

# Check if in a git repo (for project/local scopes)
git rev-parse --git-dir >/dev/null 2>&1 && echo "in_git_repo"
```

Then use AskUserQuestion with available options:

```json
{
  "question": "Which memory scope would you like to check?",
  "header": "Memory scope",
  "options": [
    {"label": "User", "description": "Personal cross-project memories in ~/.claude/memory/"},
    {"label": "Project", "description": "Shared project memories in .claude/memory/ (tracked in git)"},
    {"label": "Local", "description": "Personal project memories in .claude/memory/local/ (gitignored)"},
    {"label": "All accessible", "description": "Check all accessible scopes sequentially"}
  ],
  "multiSelect": false
}
```

**Dynamic options**:
- Only show "Project" and "Local" if in a git repository
- Always show "User" and "All accessible"
- Enterprise scope is supported but not shown by default (pass `--enterprise` explicitly)

### 2. Run Validation

For each selected scope, run the memory validate command:

```bash
memory validate <scope>
```

Where `<scope>` is one of: `user`, `project`, `local`, `enterprise`.

**For `--all` option**, run validation for each accessible scope in precedence order:
1. User (always)
2. Project (if in git repo)
3. Local (if in git repo)
4. Enterprise (if configured, for managed environments)

### 3. Parse and Present Results

The validate command returns JSON with:
- `data.score` - Health score (0-100)
- `data.rating` - Rating (Excellent/Good/Needs Attention/Critical)
- `data.counts` - Node, edge, file counts
- `data.types` - Memory type breakdown (decisions/artifacts/learnings)
- `data.issues` - Detailed issue lists
- `data.issue_counts` - Issue counts by category
- `data.fix_commands` - Commands to fix issues

Present the results as a formatted report:

```markdown
# Memory System Health Report

**Scope**: {scope}
**Score**: {score}/100 ({rating})

## Summary

| Metric | Value |
|--------|-------|
| Index entries | {counts.index_entries} |
| Graph nodes | {counts.graph_nodes} |
| Disk files | {counts.disk_files} |
| Edges | {counts.edges} |

## Memory Types

| Type | Count |
|------|-------|
| Decisions | {types.decisions} |
| Artifacts | {types.artifacts} |
| Learnings | {types.learnings} |
| Other | {types.other} |

## Issues Found

{For each non-zero issue_count, list the issues}

## Fix Commands

{If fix_commands not empty, show them}
```

**For multi-scope checks (`--all`)**, present a combined summary first:

```markdown
# Memory System Health Report - All Scopes

| Scope | Score | Rating | Issues |
|-------|-------|--------|--------|
| User | {score}/100 | {rating} | {issue_count} |
| Project | {score}/100 | {rating} | {issue_count} |
| Local | {score}/100 | {rating} | {issue_count} |

{Then detailed breakdown for each scope}
```

### 4. Run Additional Checks

After validation, run these additional checks:

**Prune expired temporaries:**
```bash
memory prune
```
Report if any expired memories were removed.

**Graph statistics:**
```bash
memory stats <scope>
```
Include in report:
- Hub nodes (high connectivity)
- Sink nodes (no outbound edges)
- Source nodes (no inbound edges)
- Edge-to-node ratio

**Quick quality audit (optional, if score >= 90):**
```bash
memory audit-quick <scope> --threshold 50
```
Reports memories with quality issues (stale references, missing edges, etc.)

### 5. Offer Next Actions

```json
{
  "question": "Memory health score is {score}/100. What would you like to do?",
  "header": "Next action",
  "options": [
    {"label": "Fix issues", "description": "Run sync + fix commands to resolve problems"},
    {"label": "Find new links", "description": "Run suggest-links to discover semantic connections (requires Ollama)"},
    {"label": "Quality audit", "description": "Run full quality audit to find stale/outdated memories"},
    {"label": "Deep analysis", "description": "Use memory:curator agent for detailed analysis"},
    {"label": "Done", "description": "No action needed"}
  ],
  "multiSelect": false
}
```

**Dynamic options:**
- Only show "Fix issues" if there are issues to fix
- Only show "Find new links" if score >= 80
- Only show "Quality audit" if score >= 90 (focus on content quality when structure is healthy)

**If "Fix issues" selected**:
1. First run sync to reconcile graph/index/disk:
   ```bash
   memory sync <scope>
   ```
2. Then run any additional fix commands from `data.fix_commands`
3. Re-run validate to verify fixes

**If "Find new links" selected**:
1. Check Ollama is running: `ollama list | grep -q embeddinggemma`
2. If not available, inform user: "Ollama with embeddinggemma model required. Run: `ollama pull embeddinggemma`"
3. If available, run: `memory suggest-links --threshold 0.80 --scope <scope>`
4. Present suggestions and offer to auto-link with `--auto-link`

**If "Quality audit" selected**:
1. Run full quality audit:
   ```bash
   memory audit <scope> --threshold 70
   ```
2. Present memories with quality issues
3. Offer to archive or delete low-quality memories

**If "Deep analysis" selected**:
- Launch memory:curator agent with current state

## Quick Check Option

If `$ARGUMENTS` contains `quick` or `--quick`:
- Run `memory health <scope>` instead of `memory validate`
- This is faster but only checks graph connectivity (not index/file sync)

### 6. Frontmatter Sync Check

**Important**: Graph operations (link, tag, move) update graph.json and index.json but do NOT update file frontmatter. This means the `links:` field in .md files can become stale.

After validation, check for frontmatter desync:

```bash
# Sample 5 random memories and compare frontmatter links vs graph edges
memory graph <scope> | jq -r '.edges[] | "\(.source) -> \(.target)"' > /tmp/graph-edges.txt
for id in $(memory list --scope <scope> | jq -r '.data.memories[].id' | shuf | head -5); do
  file_links=$(memory read "$id" | jq -r '.data.links // [] | .[]' 2>/dev/null | wc -l)
  graph_links=$(grep "^$id -> " /tmp/graph-edges.txt | wc -l)
  if [ "$file_links" != "$graph_links" ]; then
    echo "DESYNC: $id has $file_links frontmatter links but $graph_links graph edges"
  fi
done
```

**If desync detected**, inform user:
> Frontmatter desync detected: File `links:` fields don't match graph edges.
> This is cosmetic (graph is authoritative) but can cause confusion when reading raw files.
> The memory skill doesn't currently have a `sync-frontmatter` command - this is a known limitation.

### 7. Suggest-Links Recommendation

After health check completes successfully (score >= 80), check if suggest-links might find new connections:

```bash
# Check when suggest-links was last run (from manifest timestamp)
manifest="~/.claude/skills/memory/.suggest-cache/embedding-manifest.json"
if [ -f "$manifest" ]; then
  last_run=$(stat -c %Y "$manifest" 2>/dev/null || stat -f %m "$manifest" 2>/dev/null)
  now=$(date +%s)
  days_ago=$(( (now - last_run) / 86400 ))
  if [ "$days_ago" -gt 7 ]; then
    echo "suggest-links last run $days_ago days ago"
  fi
fi
```

**Offer suggest-links if**:
- Last run was >7 days ago, OR
- >10 new memories added since last run, OR
- User explicitly requests link suggestions

## Scope Reference

| Scope | Flag | Storage Path | Description |
|-------|------|--------------|-------------|
| Enterprise | `--enterprise` | `CLAUDE_MEMORY_ENTERPRISE_PATH` | Organisation-wide (managed environments) |
| Local | `--local` | `.claude/memory/local/` | Personal project memories (gitignored) |
| Project | `--project` | `.claude/memory/` | Shared project memories (in git) |
| Global | `--global` | `~/.claude/memory/` | Personal cross-project memories |

**Precedence order**: Enterprise > Local > Project > Global (earlier scopes override later ones)

**Legacy alias**: `--user` is accepted as an alias for `--global`.

## Notes

- `memory health` = Quick connectivity check only
- `memory validate` = Comprehensive validation including sync checks
- Both commands are built into the memory skill
- The validate command detects: missing nodes, ghost nodes, orphan files, hub issues, tag issues
- **Frontmatter desync** is a known limitation - graph.json is authoritative, file frontmatter is informational only
- **suggest-links** requires Ollama with embeddinggemma model for semantic similarity
- **Enterprise scope** is for managed environments and requires explicit configuration via environment variable or managed-settings.json
