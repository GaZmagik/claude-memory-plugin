---
description: Check recent work against documented gotchas and warnings in memory system. Prevents repeating past mistakes.
argument-hint: "[topic] [--scope <user|project|local>]"
version: "2.1.0"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Search the memory system for relevant gotchas, warnings, and learnings that apply to recent work. This is a proactive mistake-prevention check, not a git pre-commit hook.

By default, searches ALL accessible scopes (User → Project → Local) to ensure comprehensive gotcha coverage.

## Execution Steps

### 1. Parse Arguments

**Check for scope restriction**:
- `--scope user` or `--scope global` → Search user scope only
- `--scope project` → Search project scope only
- `--scope local` → Search local scope only
- `--scope enterprise` → Search enterprise scope only (for managed environments)
- No `--scope` specified → Search ALL accessible scopes (recommended)

**Note**: `--scope global` is accepted as a legacy alias for `--scope user`.

**Check for work scope** (what to check):
- `all` or `--all` → Check all memories for gotchas (comprehensive review)
- `staged` → Check only staged git changes
- `recent` → Check recent work (last commit, uncommitted changes)
- `{file-path}` → Check specific file or pattern
- `{topic}` → Any other argument is treated as a topic to search for

**If no arguments** (default):
- Check recent work (uncommitted changes + last commit)
- If nothing recent, offer to check all gotchas

### 2. Determine Accessible Scopes

Check which scopes are accessible for searching:

```bash
# Check enterprise scope availability (for managed environments)
enterprise_enabled=$(memory config get scopes.enterprise.enabled 2>/dev/null | jq -r '.data // false')

# Check if in a git repo (for project/local scopes)
in_git_repo=$(git rev-parse --git-dir >/dev/null 2>&1 && echo "true" || echo "false")
```

**Accessible scopes** (in precedence order):
1. User - always accessible
2. Project - if `in_git_repo` is true
3. Local - if `in_git_repo` is true
4. Enterprise - if `enterprise_enabled` is true (for managed environments)

### 3. Load Gotcha Prevention Checklist Hubs

**For each accessible scope**, check for the centralised gotcha hub:

```bash
# Check hub in each scope
# User: ~/.claude/memory/permanent/artifact-gotcha-prevention-checklist.md
# Project: .claude/memory/permanent/artifact-gotcha-prevention-checklist.md
# Local: .claude/memory/local/permanent/artifact-gotcha-prevention-checklist.md
# Enterprise: $CLAUDE_MEMORY_ENTERPRISE_PATH/permanent/artifact-gotcha-prevention-checklist.md

test -f <scope-path>/permanent/artifact-gotcha-prevention-checklist.md && echo "Hub exists in <scope>"
```

**If hub exists in any scope**:
- Read the hub file(s)
- Extract Critical and High severity gotchas already catalogued
- Note the linked learning IDs for cross-reference
- Use these as the **primary source** of known gotchas
- Track which scope each gotcha came from

**If no hubs exist**:
- Note: "Gotcha Prevention Checklist hub not yet created in any scope"
- Proceed with raw memory search (Step 5)
- Flag this for potential hub creation at end of check

**Hub structure expected**:
```markdown
## Critical Gotchas
- [ ] {gotcha description} → `learning-{id}`

## High Priority Gotchas
- [ ] {gotcha description} → `learning-{id}`
```

### 4. Gather Context

Collect information about the work to check:

**For recent work**:
```bash
# Get uncommitted changes
git status --short
git diff --name-only

# Get last commit
git log -1 --name-only --pretty=format:"%s"

# Get current branch
git branch --show-current
```

**Extract patterns**:
- **File paths**: What areas of codebase? (src/cli/, tests/, .claude/memory/)
- **File types**: Languages? (.rs, .ts, .py, .md)
- **Keywords from changes**: What operations? (validation, schema, test, build, auth)
- **Technologies**: Frameworks/libraries mentioned? (IPFS, AJV, Helia, TypeScript)

### 5. Multi-Scope Gotcha Search Strategy

Execute searches across all accessible scopes:

#### Tier 1: Hub Checklists (Primary Source)

**For each scope with a hub** (loaded in Step 3):
- Filter hub gotchas by relevance to gathered context
- Match gotcha descriptions against:
  - File paths being modified
  - Technologies in use
  - Operations being performed
- Mark applicable hub gotchas for inclusion in results
- Tag each result with its source scope
- These are **pre-validated, high-confidence** matches

#### Tier 2: Raw Memory Search (Supplementary)

Search raw learnings in ALL accessible scopes for additional gotchas **not already in any hub**.

Use the **memory:recall agent** to find applicable warnings:

```
Invoke Task tool with subagent_type=memory:recall:

"Search memory for gotchas, warnings, and learnings relevant to this work context.

**Scopes to Search**: [list accessible scopes: user, project, local, enterprise]

**Work Context:**
- Files modified: [list file paths]
- Technologies: [detected technologies]
- Operations: [keywords from diffs/commit messages]
- Areas: [codebase sections affected]

**Search Focus:**
- Primary: learnings with tags 'gotcha', 'warning', 'critical', 'high'
- Secondary: learnings related to detected technologies
- Tertiary: decisions with prevention strategies

**Required Output:**
For each relevant gotcha, provide:
1. Memory ID
2. Source scope (user/project/local/enterprise)
3. Severity (critical/high/medium/low)
4. Title/description
5. Why it's relevant (matching pattern)
6. Prevention strategy
7. Related memories (decisions, artifacts)

**Prioritize by:**
1. Severity (critical > high > medium > low)
2. Scope (user > project > local for same severity)
3. Relevance (exact file match > technology match > general pattern)
4. Recurrence (if marked as recurring issue)

Limit to top 15 most relevant gotchas across all scopes.
Deduplicate by memory ID (same gotcha in multiple scopes = show highest precedence scope only).
"
```

#### Tier 3: Hub Coverage Analysis

**Flag missing high-severity learnings**:
- Compare raw memory search results against all hub contents
- Identify any learnings with severity `critical` or `high` that are **not** in any hub
- Track these for the Hub Coverage report section

```
For each high-severity learning found in raw search:
  - Check if its ID appears in any hub checklist
  - If NOT in any hub → flag as "missing from hub"
  - Record: learning ID, severity, title, source scope
```

### 6. Present Findings

Format findings with scope information:

```markdown
# Gotcha Check Results

**Date**: {current_date}
**Work Scope**: {what was checked}
**Memory Scopes Searched**: {list of scopes searched}
**Context**: {files/technologies/operations detected}

---

## Summary

Found **{count}** relevant gotchas across {scope_count} scopes:
- **Critical**: {count} - Must address before proceeding
- **High**: {count} - Should address soon
- **Medium**: {count} - Good to be aware of
- **Low**: {count} - FYI only

**By Scope**:
| Scope | Gotchas Found |
|-------|---------------|
| User | {count} |
| Project | {count} |
| Local | {count} |

---

## Critical Gotchas

### [CRITICAL] {Gotcha Title}

**Memory**: `{memory-id}` | **Scope**: {scope}

**Why Relevant**:
- You're working on: {matching file/pattern}
- Past issue: {what went wrong before}
- Risk: {what could go wrong now}

**The Gotcha**:
{Description from memory - the actual mistake that was made}

**Prevention**:
{Prevention strategy from memory}

**Example** (if available in memory):
```
{Code example from memory showing right vs wrong}
```

**Related**:
- Decision: {decision-id} (why we chose this approach)
- Artifact: {artifact-id} (pattern to use)
- Learning: {learning-id} (related gotcha)

---

{Repeat for each critical gotcha}

## High Priority Gotchas

{Same format for high-severity items}

## Medium Priority Gotchas

{Same format for medium-severity items}

## Low Priority (Informational)

{Brief list of low-severity items}

---

## Pattern Analysis

**Recurring Issues Detected**:
{If any gotcha appears multiple times in memory, highlight it}
- "{Gotcha X}" appears in {count} memories
- Recommendation: Create automation to prevent this (see /session-end)

**Cross-Scope Patterns**:
{If same gotcha appears in multiple scopes}
- "{Gotcha Y}" found in both Project and User scopes
- Consider: Promote to higher scope or deduplicate

**Coverage Gaps**:
{If work area has no related gotchas}
- No gotchas documented for: {technology/area}
- Consider: This might be the first time working in this area
- Suggestion: Document learnings after this work

---

## Hub Coverage Report

**Hubs Found**: {list scopes with hubs}

{For each scope with a hub}:

### {Scope} Scope Hub

**Hub Coverage**: {X}/{Y} high-severity learnings are in the Gotcha Checklist

| Severity | In Hub | Total | Coverage |
|----------|--------|-------|----------|
| Critical | {n}    | {m}   | {%}      |
| High     | {n}    | {m}   | {%}      |

**Missing from Hub** (should be added):
{If any high-severity learnings found that are NOT in hub}
- `learning-{id}`: {title} [severity: {critical/high}]

{If no hubs exist}:

**No Hubs Found**: Gotcha Prevention Checklist hubs do not exist in any scope.

Found **{count}** high-severity learnings that should be catalogued:
- `learning-{id}`: {title} [severity: {critical/high}] [scope: {scope}]

**Recommendation**: Create a hub in the appropriate scope to centralise gotcha tracking.

---

## Recommendations

```
Use AskUserQuestion to offer next actions:

{
  question: "Found {count} relevant gotchas across {scope_count} scopes. What would you like to do?",
  header: "Next action",
  options: [
    {
      label: "Review details",
      description: "Show full memory entries for critical/high gotchas"
    },
    {
      label: "Update hub",
      description: "Add missing high-severity gotchas to the checklist hub"
    },
    {
      label: "Create prevention",
      description: "Set up automation to prevent recurring issues"
    },
    {
      label: "Proceed aware",
      description: "I've reviewed the warnings and will proceed carefully"
    }
  ],
  multiSelect: false
}
```

**If "Review details" selected**:
- Read full memory files for critical/high gotchas
- Present complete prevention strategies
- Show code examples if available

**If "Update hub" selected**:
- Ask which scope's hub to update (if multiple exist)
- If hub exists in selected scope:
  - Read current hub contents
  - Append missing high-severity gotchas to appropriate sections
  - Preserve existing checklist items
  - Use memory skill to update the artifact
- If hub does not exist in selected scope:
  - Create new hub file at `<scope-path>/permanent/artifact-gotcha-prevention-checklist.md`
  - Populate with all discovered high-severity gotchas for that scope
  - Structure with Critical and High Priority sections
  - Link each item to its source learning ID

**If "Create prevention" selected**:
- For recurring issues, offer to create hooks/skills/commands
- Use same automation creation flow as /session-end
- Ask: which scope for the automation? (project-level or user-level)

---

## Examples by Scope

### Example 1: Default Multi-Scope Search

```
User: /check-gotchas

Searches: User → Project → Local

Memory search finds:
- 1 critical from User: Common TypeScript pattern violation
- 2 critical from Project: Build-test mismatch, Schema validation
- 1 high from Local: Personal workflow gotcha

Output: Combined results with scope tags, sorted by severity
```

### Example 2: Single Scope Search

```
User: /check-gotchas --scope project

Searches: Project scope only

Memory search finds:
- 2 critical: Build-test mismatch, Schema validation
- 1 high: Async test timing

Output: Project-only gotchas
```

### Example 3: Staged Changes with Topic

```
User: /check-gotchas staged validation

Git shows: src/validation/schema.ts
Topic filter: "validation"

Memory search finds across all scopes:
- Validation-related gotchas only
- Schema-specific warnings
- Related decisions about validation approach

Output: Targeted warnings for validation work
```

---

## Special Cases

### No Relevant Gotchas Found

```markdown
# Gotcha Check: All Clear

No relevant gotchas found for this work.

**Checked:**
- Files: {list}
- Technologies: {list}
- Scopes searched: {list}
- Memory search: {count} total gotchas reviewed across all scopes

**This means:**
✅ No documented past mistakes match this work
✅ Either you're working in a new area, or
✅ This area hasn't had gotchas yet

**Recommendation:**
Document any gotchas you discover during this work so future sessions can benefit.
```

### Memory System Empty

```markdown
# Gotcha Check: No Memory Data

The memory system has no documented gotchas in any accessible scope.

**Scopes checked**: {list}

**This is expected if:**
- This is a new project
- Memory system was recently initialised
- No learnings have been documented

**Recommendation:**
As you work, document gotchas using:
`memory write --type gotcha --scope <scope> ...`
```

---

## Scope Reference

| Scope | Flag | Hub Path | Description |
|-------|------|----------|-------------|
| Enterprise | `--scope enterprise` | `$CLAUDE_MEMORY_ENTERPRISE_PATH/permanent/` | Organisation-wide (managed environments) |
| Local | `--scope local` | `.claude/memory/local/permanent/` | Personal project (gitignored) |
| Project | `--scope project` | `.claude/memory/permanent/` | Shared project (in git) |
| Global | `--scope global` | `~/.claude/memory/permanent/` | Personal cross-project |

**Precedence order**: Enterprise > Local > Project > Global (earlier scopes override later ones)

**Legacy alias**: `--scope user` is accepted as an alias for `--scope global`.

**Default behaviour**: Search all accessible scopes, merge and deduplicate results.

## Notes

- This command is **read-only** by default - never modifies code or git state
- "Update hub" option can modify the gotcha checklist hub (with user consent)
- Uses **three-tier search**: Hub checklists → Raw memory → Coverage analysis
- **Multi-scope search** merges results across all accessible scopes by default
- Gotchas are deduplicated by memory ID (highest precedence scope wins)
- Hub provides curated, severity-ranked gotchas; raw search finds additional matches
- Effectiveness depends on documented learnings in memory
- Use **memory:recall agent** for intelligent pattern matching
- Can run anytime - doesn't require staged changes
- Best used proactively before starting work, not just before committing
- Recurring gotchas indicate need for automation (hooks/linters/skills)
- Hub Coverage Report helps maintain completeness of the gotcha checklist
- **Enterprise scope** is for managed environments - pass `--scope enterprise` explicitly if needed
