---
description: Check memory system health including graph connectivity, hub integrity, frontmatter sync, and link suggestions.
argument-hint: "local | global] [quick]"
version: "2.0.0"
---

## User Input

```text
$ARGUMENTS
```

## Goal

Perform a health check of the memory system using the built-in `memory validate` command.

## Execution Steps

### 1. Determine Scope

**Check arguments first**:
- `global` → Use `global` scope
- `local` → Use `local` scope
- `quick` → Use quick check mode (see Quick Check Option below)
- Combinations (e.g. `local quick`) → Parse accordingly

**If no scope provided**, use AskUserQuestion:
```json
{
  "question": "Which memory system would you like to check?",
  "header": "Memory scope",
  "options": [
    {"label": "Project", "description": "Project-specific memories in .claude/memory/"},
    {"label": "User (global)", "description": "Cross-project memories in ~/.claude/memory/"},
    {"label": "Both", "description": "Check both memory systems sequentially"}
  ],
  "multiSelect": false
}
```

### 2. Run Validation

For each selected scope, run the memory validate command:

```bash
~/.claude/skills/memory/memory.sh validate <scope>
```

Where `<scope>` is `local` or `global`.

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

### 4. Run Additional Checks

After validation, run these additional checks:

**Prune expired temporaries:**
```bash
~/.claude/skills/memory/memory.sh prune
```
Report if any expired memories were removed.

**Graph statistics:**
```bash
~/.claude/skills/memory/memory.sh stats <scope>
```
Include in report:
- Hub nodes (high connectivity)
- Sink nodes (no outbound edges)
- Source nodes (no inbound edges)
- Edge-to-node ratio

**Quick quality audit (optional, if score ≥ 90):**
```bash
~/.claude/skills/memory/memory.sh audit-quick <scope> --threshold 50
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
    {"label": "Deep analysis", "description": "Use memory-curator agent for detailed analysis"},
    {"label": "Done", "description": "No action needed"}
  ],
  "multiSelect": false
}
```

**Dynamic options:**
- Only show "Fix issues" if there are issues to fix
- Only show "Find new links" if score ≥ 80
- Only show "Quality audit" if score ≥ 90 (focus on content quality when structure is healthy)

**If "Fix issues" selected**:
1. First run sync to reconcile graph/index/disk:
   ```bash
   ~/.claude/skills/memory/memory.sh sync <scope>
   ```
2. Then run any additional fix commands from `data.fix_commands`
3. Re-run validate to verify fixes

**If "Find new links" selected**:
1. Check Ollama is running: `ollama list | grep -q embeddinggemma`
2. If not available, inform user: "Ollama with embeddinggemma model required. Run: `ollama pull embeddinggemma`"
3. If available, run: `~/.claude/skills/memory/memory.sh suggest-links --threshold 0.80 --scope <scope>`
4. Present suggestions and offer to auto-link with `--auto-link`

**If "Quality audit" selected**:
1. Run full quality audit:
   ```bash
   ~/.claude/skills/memory/memory.sh audit <scope> --threshold 70
   ```
2. Present memories with quality issues
3. Offer to archive or delete low-quality memories

**If "Deep analysis" selected**:
- Launch memory-curator agent with current state

## Quick Check Option

If `$ARGUMENTS` contains `quick`:
- Run `memory health <scope>` instead of `memory validate`
- This is faster but only checks graph connectivity (not index/file sync)

### 5. Frontmatter Sync Check

**Important**: Graph operations (link, tag, move) update graph.json and index.json but do NOT update file frontmatter. This means the `links:` field in .md files can become stale.

After validation, check for frontmatter desync:

```bash
# Sample 5 random memories and compare frontmatter links vs graph edges
~/.claude/skills/memory/memory.sh graph <scope> | jq -r '.edges[] | "\(.source) -> \(.target)"' > /tmp/graph-edges.txt
for id in $(~/.claude/skills/memory/memory.sh list --scope <scope> | jq -r '.data.memories[].id' | shuf | head -5); do
  file_links=$(~/.claude/skills/memory/memory.sh read "$id" | jq -r '.data.links // [] | .[]' 2>/dev/null | wc -l)
  graph_links=$(grep "^$id -> " /tmp/graph-edges.txt | wc -l)
  if [ "$file_links" != "$graph_links" ]; then
    echo "DESYNC: $id has $file_links frontmatter links but $graph_links graph edges"
  fi
done
```

**If desync detected**, inform user:
> ⚠️ Frontmatter desync detected: File `links:` fields don't match graph edges.
> This is cosmetic (graph is authoritative) but can cause confusion when reading raw files.
> The memory skill doesn't currently have a `sync-frontmatter` command - this is a known limitation.

### 6. Suggest-Links Recommendation

After health check completes successfully (score ≥ 80), check if suggest-links might find new connections:

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

Add to the "Next action" options:
```json
{"label": "Find new links", "description": "Run suggest-links to discover semantic connections (requires Ollama)"}
```

**If "Find new links" selected**:
1. Check Ollama is running: `ollama list | grep -q embeddinggemma`
2. If not available, inform user: "Ollama with embeddinggemma model required. Run: ollama pull embeddinggemma"
3. If available, run: `~/.claude/skills/memory/memory.sh suggest-links --threshold 0.80 --scope <scope>`
4. Present suggestions and offer to auto-link

## Notes

- `memory health` = Quick connectivity check only
- `memory validate` = Comprehensive validation including sync checks
- Both commands are built into the memory skill
- The validate command detects: missing nodes, ghost nodes, orphan files, hub issues, tag issues
- **Frontmatter desync** is a known limitation - graph.json is authoritative, file frontmatter is informational only
- **suggest-links** requires Ollama with embeddinggemma model for semantic similarity
