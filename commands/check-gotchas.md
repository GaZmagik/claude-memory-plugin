---
description: Check recent work against documented gotchas and warnings in memory system. Prevents repeating past mistakes.
argument-hint: "[topic]"
version: "1.0.0"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Search the memory system for relevant gotchas, warnings, and learnings that apply to recent work. This is a proactive mistake-prevention check, not a git pre-commit hook.

## Execution Steps

### 1. Load Gotcha Prevention Checklist Hub

**First**, check for the centralised gotcha hub which provides pre-categorised, severity-ranked gotchas:

```bash
# Check if hub exists
test -f .claude/memory/permanent/artifact-gotcha-prevention-checklist.md && echo "Hub exists"
```

**If hub exists**:
- Read `.claude/memory/permanent/artifact-gotcha-prevention-checklist.md`
- Extract Critical and High severity gotchas already catalogued
- Note the linked learning IDs for cross-reference
- Use this as the **primary source** of known gotchas

**If hub does not exist**:
- Note: "Gotcha Prevention Checklist hub not yet created"
- Proceed with raw memory search (Step 4)
- Flag this for potential hub creation at end of check

**Hub structure expected**:
```markdown
## Critical Gotchas
- [ ] {gotcha description} → `learning-{id}`

## High Priority Gotchas
- [ ] {gotcha description} → `learning-{id}`
```

### 2. Determine Scope

Check what work to analyse based on arguments or current state:

**If $ARGUMENTS provided**:
- `all` or `--all` → Check all memories for gotchas (comprehensive review)
- `staged` → Check only staged git changes
- `recent` → Check recent work (last commit, uncommitted changes)
- `{file-path}` → Check specific file or pattern

**If no arguments** (default):
- Check recent work (uncommitted changes + last commit)
- If nothing recent, offer to check all gotchas

### 3. Gather Context

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

### 4. Three-Tier Gotcha Search Strategy

Execute searches in priority order:

#### Tier 1: Hub Checklist (Primary Source)

**If hub was loaded in Step 1**:
- Filter hub gotchas by relevance to gathered context
- Match gotcha descriptions against:
  - File paths being modified
  - Technologies in use
  - Operations being performed
- Mark applicable hub gotchas for inclusion in results
- These are **pre-validated, high-confidence** matches

#### Tier 2: Raw Memory Search (Supplementary)

Search raw learnings for additional gotchas **not already in the hub**.

Use the **memory-recall agent** to find applicable warnings:

```
Invoke Task tool with subagent_type=memory-recall:

"Search memory for gotchas, warnings, and learnings relevant to this work context:

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
2. Severity (critical/high/medium/low)
3. Title/description
4. Why it's relevant (matching pattern)
5. Prevention strategy
6. Related memories (decisions, artifacts)

**Prioritize by:**
1. Severity (critical > high > medium > low)
2. Relevance (exact file match > technology match > general pattern)
3. Recurrence (if marked as recurring issue)

Limit to top 10 most relevant gotchas.
"
```

#### Tier 3: Hub Coverage Analysis

**Flag missing high-severity learnings**:
- Compare raw memory search results against hub contents
- Identify any learnings with severity `critical` or `high` that are **not** in the hub
- Track these for the Hub Coverage report section

```
For each high-severity learning found in raw search:
  - Check if its ID appears in hub checklist
  - If NOT in hub → flag as "missing from hub"
  - Record: learning ID, severity, title
```

### 5. Present Findings

Format findings from memory-recall agent:

```markdown
# Gotcha Check Results

**Date**: {current_date}
**Scope**: {what was checked}
**Context**: {files/technologies/operations detected}

---

## Summary

Found **{count}** relevant gotchas from memory:
- **Critical**: {count} - Must address before proceeding
- **High**: {count} - Should address soon
- **Medium**: {count} - Good to be aware of
- **Low**: {count} - FYI only

---

## Critical Gotchas

### [CRITICAL] {Gotcha Title}

**Memory**: `{memory-id}` ([View full memory](#))

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

**Coverage Gaps**:
{If work area has no related gotchas}
- No gotchas documented for: {technology/area}
- Consider: This might be the first time working in this area
- Suggestion: Document learnings after this work

---

## Hub Coverage Report

**Status**: {Hub exists / Hub not found}

{If hub exists}:

**Hub Coverage**: {X}/{Y} high-severity learnings are in the Gotcha Checklist

| Severity | In Hub | Total | Coverage |
|----------|--------|-------|----------|
| Critical | {n}    | {m}   | {%}      |
| High     | {n}    | {m}   | {%}      |

**Missing from Hub** (should be added):
{If any high-severity learnings found that are NOT in hub}
- `learning-{id}`: {title} [severity: {critical/high}]
- `learning-{id}`: {title} [severity: {critical/high}]

**Recommendation**: Run the memory skill to add missing learnings to the hub:
```
Add these learnings to .claude/memory/permanent/artifact-gotcha-prevention-checklist.md
```

{If hub does not exist}:

**Hub Not Found**: The Gotcha Prevention Checklist hub does not exist yet.

Found **{count}** high-severity learnings that should be catalogued:
- `learning-{id}`: {title} [severity: {critical/high}]

**Recommendation**: Create the hub to centralise gotcha tracking:
```markdown
# Gotcha Prevention Checklist

## Critical Gotchas
- [ ] {gotcha description} → `learning-{id}`

## High Priority Gotchas
- [ ] {gotcha description} → `learning-{id}`
```

---

## Recommendations

```
Use AskUserQuestion to offer next actions:

{
  question: "Found {count} relevant gotchas. What would you like to do?",
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
- If hub exists:
  - Read current hub contents
  - Append missing high-severity gotchas to appropriate sections
  - Preserve existing checklist items
  - Use memory skill to update the artifact
- If hub does not exist:
  - Create new hub file at `.claude/memory/permanent/artifact-gotcha-prevention-checklist.md`
  - Populate with all discovered high-severity gotchas
  - Structure with Critical and High Priority sections
  - Link each item to its source learning ID

**If "Create prevention" selected**:
- For recurring issues, offer to create hooks/skills/commands
- Use same automation creation flow as /session-end
- Ask: project-level or user-level automation?

---

## Examples by Scope

### Example 1: Recent Work Check

```
User: /check-gotchas

Memory search finds:
- 2 critical: Build-test mismatch (matches uncommitted CLI changes)
- 1 high: Schema string manipulation (matches validation.ts changes)
- 3 medium: General TypeScript patterns

Output: Focused warning on build-test and schema issues
```

### Example 2: Staged Changes

```
User: /check-gotchas staged

Git shows: src/ipfs/daemon.ts, tests/daemon.test.ts

Memory search finds:
- 1 critical: Daemon validation bypass (exact file match!)
- 1 high: Async test timing (matches test file)

Output: Strong warning about known daemon path issue
```

### Example 3: Comprehensive Review

```
User: /check-gotchas all

Memory search returns:
- All learnings tagged 'gotcha' or 'warning'
- Grouped by severity
- Full list for review

Output: Complete gotcha inventory from memory
```

### Example 4: Specific File

```
User: /check-gotchas src/validation/schema.ts

Memory search finds:
- Schema-related gotchas only
- Validation-specific warnings
- Related decisions about validation approach

Output: Targeted warnings for that file
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
- Memory search: {count} total gotchas reviewed

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

The memory system has no documented gotchas yet.

**This is expected if:**
- This is a new project
- Memory system was recently initialized
- No learnings have been documented

**Recommendation:**
As you work, document gotchas using:
`~/.claude/skills/memory/learnings.sh add {id} --tags gotcha,warning`
```

### Multiple Recurring Issues

```markdown
# Gotcha Check: Recurring Pattern Detected

⚠️  **ALERT**: {count} gotchas are recurring (appear multiple times in memory)

**Most Frequent:**
1. "{Gotcha X}" - appears {count} times
2. "{Gotcha Y}" - appears {count} times
3. "{Gotcha Z}" - appears {count} times

**RECOMMENDATION: Create Automation**

These issues keep happening. Time to prevent them permanently:
- Use `/session-end` quality gate to set up prevention
- Create git hooks, linters, or validation scripts
- Stop documenting the same mistake repeatedly
```

---

## Integration with Other Commands

**From /session-end**:
- Quality review finds recurring issue
- Suggests: "Run /check-gotchas to see full history of this issue"
- Then offer automation creation

**Before /speckit.implement**:
- Check gotchas related to feature area before starting
- Proactive warning: "Past issues in this area: X, Y, Z"

**After fixing a bug**:
- Document the gotcha
- Run /check-gotchas to see if it's related to existing warnings

---

## Notes

- This command is **read-only** by default - never modifies code or git state
- "Update hub" option can modify the gotcha checklist hub (with user consent)
- Uses **three-tier search**: Hub checklist → Raw memory → Coverage analysis
- Hub provides curated, severity-ranked gotchas; raw search finds additional matches
- Effectiveness depends on documented learnings in memory
- Use **memory-recall agent** for intelligent pattern matching
- Can run anytime - doesn't require staged changes
- Best used proactively before starting work, not just before committing
- Recurring gotchas indicate need for automation (hooks/linters/skills)
- Hub Coverage Report helps maintain completeness of the gotcha checklist
