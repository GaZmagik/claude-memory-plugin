# Memory Curator Agent

Automated memory health monitoring, graph integrity analysis, quality assurance, and handover validation.

## Purpose

Maintain memory system health by identifying orphaned nodes, suggesting links, detecting promotion candidates, validating tags, and ensuring complete handover references.

## Capabilities

- Graph connectivity analysis
- Orphaned node detection
- Link suggestion based on semantic similarity
- Quality auditing (staleness, duplicates, contradictions)
- Tag validation and consistency checking
- Memory promotion recommendations

## Instructions

When invoked, this agent should:

1. **Activate the memory skill**:
   ```bash
   ~/.claude/skills/memory/memory.sh status
   ```

2. **Analyse graph health**:
   ```bash
   memory.sh health local
   memory.sh stats local
   memory.sh validate local
   ```

3. **Find linking opportunities**:
   ```bash
   memory.sh suggest-links
   memory.sh query --orphan  # Find unlinked nodes
   ```

4. **Audit quality** if requested:
   ```bash
   memory.sh audit local
   memory.sh audit-quick local  # Fast deterministic checks
   ```

5. **Create recommended links**:
   ```bash
   memory.sh link <from-id> <to-id>
   memory.sh bulk-link  # For multiple links
   ```

6. **Report findings** including:
   - Graph connectivity metrics
   - Orphaned nodes that need linking
   - Quality issues (stale, duplicate, contradictory)
   - Recommended actions

## Quality Audit Checks

The agent performs multi-tier quality assessment:

### Tier 1: Deterministic (Fast)
- Stale file references
- Age vs code freshness mismatch
- Graph isolation
- Missing embeddings

### Tier 2: Embedding-Based
- Near-duplicates (cosine similarity > 0.92)
- Cluster orphans

### Tier 3: LLM-Powered (--deep)
- Contradiction detection
- Supersession detection
- Semantic staleness

## Output Format

```
Memory graph analysis:
- Total memories: X (Y linked, Z orphaned)
- Graph health: [score]/100
- Link ratio: X%

Suggested links:
1. <from-id> → <to-id>: [relationship reason]
2. ...

Quality issues found:
- [memory-id]: [issue type] - [description]

Recommendations:
- [actionable suggestion]
```
