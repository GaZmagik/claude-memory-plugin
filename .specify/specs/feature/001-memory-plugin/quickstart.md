# Quickstart: Claude Code Memory Plugin

**Feature**: 001-memory-plugin
**Created**: 2026-01-10
**Purpose**: Validate implementation against success criteria

---

## Scenario 1: Basic CRUD Operations (US1 - Core Functionality)

**Goal**: Validate REQ-001 to REQ-008 (memory creation, retrieval, listing, deletion)

**Success Criteria**: SC-001 (backward compatibility), SC-002 (performance <100ms)

**Prerequisites**:
- Plugin installed
- No existing memories at test scope

**Steps**:

1. **Create a decision memory**
   ```bash
   memory write "Use OAuth2 with PKCE for authentication" \
     --type decision \
     --tags auth,oauth2,security
   ```

   **Expected Outcome**:
   - Slug generated: `decision-oauth2`
   - File created: `~/.claude/memory/decision-oauth2.md` (or `.claude/memory/` if in project)
   - YAML frontmatter includes: type, tags, created, updated timestamps
   - index.json updated with new entry
   - Confirmation message displayed with slug and path
   - Operation completes in <100ms

2. **Read the created memory**
   ```bash
   memory read decision-oauth2
   ```

   **Expected Outcome**:
   - Full memory content displayed (frontmatter + body)
   - Shows: type, tags, created/updated times, links (empty), content
   - Operation completes in <100ms

3. **Create additional memories**
   ```bash
   memory write "Token refresh requires mutex locking" \
     --type learning \
     --tags auth,oauth2,concurrency

   memory write "OAuth2 refresh race conditions" \
     --type gotcha \
     --tags auth,oauth2,concurrency

   memory write "Authentication Hub" \
     --type hub \
     --tags auth
   ```

   **Expected Outcome**:
   - 3 more memories created with slugs:
     - `learning-token-refresh`
     - `gotcha-oauth2-refresh`
     - `hub-authentication`
   - All operations complete in <100ms each

4. **List all memories**
   ```bash
   memory list
   ```

   **Expected Outcome**:
   - 4 memories displayed in table format
   - Columns: slug, title, type, scope, updated
   - Sorted by most recently updated first
   - Operation completes in <100ms

5. **Filter by type**
   ```bash
   memory list --type decision
   ```

   **Expected Outcome**:
   - Only `decision-oauth2` displayed
   - Filter indicator shown: "filtered by type=decision"

6. **Filter by tags**
   ```bash
   memory list --tags concurrency
   ```

   **Expected Outcome**:
   - 2 memories displayed: `learning-token-refresh`, `gotcha-oauth2-refresh`
   - Both tagged with "concurrency"

7. **Keyword search**
   ```bash
   memory search "refresh"
   ```

   **Expected Outcome**:
   - 2 memories found: `learning-token-refresh`, `gotcha-oauth2-refresh`
   - Matches highlighted in snippets
   - Relevance scores displayed

8. **Delete a memory**
   ```bash
   memory delete learning-token-refresh --force
   ```

   **Expected Outcome**:
   - Memory file deleted
   - index.json updated (entry removed)
   - Confirmation message: "Deleted memory: learning-token-refresh"
   - Operation completes in <100ms

9. **Verify deletion**
   ```bash
   memory list
   ```

   **Expected Outcome**:
   - Only 3 memories displayed (4 - 1 deleted)
   - `learning-token-refresh` not in list

**Validation**:
- ✅ All CRUD operations functional
- ✅ Performance <100ms for all operations
- ✅ Index remains consistent with filesystem
- ✅ YAML frontmatter format correct

---

## Scenario 2: 4-Tier Scope Resolution (US6)

**Goal**: Validate REQ-009 to REQ-016 (scope isolation and hierarchy)

**Success Criteria**: SC-007 (no cross-scope leakage)

**Prerequisites**:
- Plugin installed
- Test git repository initialized
- Clean memory state

**Steps**:

1. **Create global memory (outside git repo)**
   ```bash
   cd /tmp/non-git-dir
   memory write "Global personal note" --type breadcrumb --tags personal
   ```

   **Expected Outcome**:
   - Memory stored at `~/.claude/memory/breadcrumb-global-personal-note.md`
   - Scope: global

2. **Create project memory (inside git repo)**
   ```bash
   cd ~/test-project  # git repo
   memory write "Project team decision" --type decision --tags team,project
   ```

   **Expected Outcome**:
   - Memory stored at `~/test-project/.claude/memory/decision-project-team-decision.md`
   - Scope: project
   - Default scope auto-selected (git repo detected)

3. **Create local memory (gitignored)**
   ```bash
   memory write "Personal project note" --type breadcrumb --tags personal --scope local
   ```

   **Expected Outcome**:
   - Memory stored at `~/test-project/.claude/memory/local/breadcrumb-personal-project-note.md`
   - `.claude/memory/local/` added to .gitignore automatically
   - Scope: local

4. **Verify gitignore**
   ```bash
   cat ~/test-project/.gitignore
   ```

   **Expected Outcome**:
   - Contains entry: `.claude/memory/local/`
   - No duplicates if .gitignore already existed

5. **List memories from project (should see global + project + local)**
   ```bash
   cd ~/test-project
   memory list
   ```

   **Expected Outcome**:
   - 3 memories displayed:
     - `breadcrumb-global-personal-note [global]`
     - `decision-project-team-decision [project]`
     - `breadcrumb-personal-project-note [local]`
   - Scope indicators clearly shown

6. **List memories from non-git dir (should see only global)**
   ```bash
   cd /tmp/non-git-dir
   memory list
   ```

   **Expected Outcome**:
   - Only 1 memory: `breadcrumb-global-personal-note [global]`
   - Project and local memories NOT visible (scope isolation)

7. **Test enterprise scope (disabled by default)**
   ```bash
   memory write "Enterprise knowledge" --scope enterprise --tags enterprise
   ```

   **Expected Outcome**:
   - Error message: "Enterprise scope is disabled"
   - Instructions to enable: set `scopes.enterprise.enabled: true` in config.json
   - Instructions to configure: set `memory.enterprisePath` in managed-settings.json

8. **Filter by specific scope**
   ```bash
   cd ~/test-project
   memory list --scope project
   ```

   **Expected Outcome**:
   - Only project-scoped memory shown: `decision-project-team-decision [project]`
   - Global and local excluded

**Validation**:
- ✅ Scope isolation working (no leakage between scopes)
- ✅ Hierarchy resolution correct (enterprise → local → project → global)
- ✅ Gitignore automation functional
- ✅ Enterprise disabled by default with helpful error

---

## Scenario 3: Semantic Search with Embeddings (US2)

**Goal**: Validate REQ-017 to REQ-023 (Ollama integration, graceful degradation)

**Success Criteria**: SC-003 (80%+ relevant in top 5), SC-008 (offline operation)

**Prerequisites**:
- Plugin installed
- Memories from Scenario 1 exist
- Ollama installed and running (for success path)

**Steps (Success Path - Ollama Available)**:

1. **Verify Ollama is running**
   ```bash
   curl http://localhost:11434/api/tags
   ```

   **Expected Outcome**:
   - Ollama responds with available models
   - `embeddinggemma` or `nomic-embed-text` in list

2. **Perform semantic search**
   ```bash
   memory semantic "authentication problems"
   ```

   **Expected Outcome**:
   - Results include memories conceptually related to auth issues:
     - `gotcha-oauth2-refresh` (high similarity, directly about auth problems)
     - `decision-oauth2` (medium similarity, auth decision)
     - `hub-authentication` (medium similarity, auth hub)
   - Similarity scores displayed (0-1 range)
   - Top result has similarity >0.7
   - Results ranked by similarity (highest first)

3. **Verify embedding cache created**
   ```bash
   ls ~/.claude/memory/.embedding-cache/
   ```

   **Expected Outcome**:
   - Cache files exist for searched memories:
     - `decision-oauth2.json`
     - `gotcha-oauth2-refresh.json`
     - `hub-authentication.json`
   - Each cache file contains: slug, model, vector, contentHash, timestamp

4. **Second semantic search (uses cache)**
   ```bash
   memory semantic "token refresh issues"
   ```

   **Expected Outcome**:
   - Results returned faster (cache hit)
   - No re-computation of embeddings
   - Relevant memories found without exact keyword match

**Steps (Graceful Degradation - Ollama Unavailable)**:

5. **Stop Ollama**
   ```bash
   pkill ollama
   ```

6. **Attempt semantic search**
   ```bash
   memory semantic "authentication problems"
   ```

   **Expected Outcome**:
   - Warning displayed: "Semantic search unavailable: Ollama not running at localhost:11434"
   - Setup instructions provided:
     1. Install Ollama
     2. Pull embedding model
     3. Start Ollama
   - Automatic fallback to keyword search
   - Results displayed (keyword-based, not semantic)
   - No error/crash

7. **Verify offline operation (non-semantic features work)**
   ```bash
   memory list
   memory read decision-oauth2
   memory write "Offline note" --type breadcrumb --tags offline
   ```

   **Expected Outcome**:
   - All CRUD operations work normally
   - No errors related to Ollama
   - Only semantic search affected

**Validation**:
- ✅ Semantic search returns conceptually relevant results
- ✅ Top 5 results >80% relevant for test queries
- ✅ Embedding cache working (performance improvement on repeated searches)
- ✅ Graceful degradation when Ollama unavailable
- ✅ Offline operation preserved (CRUD works without embeddings)

---

## Scenario 4: Graph Operations and Linking (US3)

**Goal**: Validate REQ-024 to REQ-029 (bidirectional linking, visualisation)

**Success Criteria**: SC-002 (graph operations <500ms)

**Prerequisites**:
- Plugin installed
- Memories from Scenario 1 exist

**Steps**:

1. **Link decision to hub**
   ```bash
   memory link decision-oauth2 hub-authentication --label part-of
   ```

   **Expected Outcome**:
   - Bidirectional edge created:
     - `decision-oauth2 --[part-of]--> hub-authentication`
     - `hub-authentication --[contains]--> decision-oauth2`
   - graph.json updated with both edges
   - Memory frontmatter updated (links array)
   - Operation completes in <500ms

2. **Link decision to gotcha**
   ```bash
   memory link decision-oauth2 gotcha-oauth2-refresh --label warns-about
   ```

   **Expected Outcome**:
   - Bidirectional edge created with reverse label "warned-by"
   - graph.json updated

3. **List edges for decision**
   ```bash
   memory edges decision-oauth2
   ```

   **Expected Outcome**:
   - Outgoing edges (2):
     - `--[part-of]--> hub-authentication (hub)`
     - `--[warns-about]--> gotcha-oauth2-refresh (gotcha)`
   - Incoming edges (0 or 1 depending on previous links)
   - Edge labels displayed
   - Operation completes in <500ms

4. **List edges for hub**
   ```bash
   memory edges hub-authentication
   ```

   **Expected Outcome**:
   - Incoming edges (1):
     - `<--[part-of]-- decision-oauth2 (decision)`
   - Shows reverse direction

5. **Generate graph visualisation**
   ```bash
   memory graph hub-authentication --depth 2
   ```

   **Expected Outcome**:
   - Mermaid diagram generated showing:
     - Hub node: `hub-authentication`
     - Connected nodes: `decision-oauth2`, `gotcha-oauth2-refresh`
     - Edge labels displayed
     - Up to 2 levels deep from hub
   - Diagram is valid Mermaid syntax (can be rendered)

6. **Unlink memories**
   ```bash
   memory unlink decision-oauth2 gotcha-oauth2-refresh
   ```

   **Expected Outcome**:
   - Both directional edges removed from graph.json
   - Memory frontmatter updated (links array)
   - Confirmation message displayed

7. **Verify unlink**
   ```bash
   memory edges decision-oauth2
   ```

   **Expected Outcome**:
   - Only 1 outgoing edge remains: `--[part-of]--> hub-authentication`
   - `gotcha-oauth2-refresh` edge removed

8. **Delete memory with edges**
   ```bash
   memory delete decision-oauth2 --force
   ```

   **Expected Outcome**:
   - Memory file deleted
   - All edges referencing `decision-oauth2` removed from graph.json
   - hub-authentication's edges cleaned up (no orphaned references)
   - Confirmation shows: "Edges removed: 1"

9. **Verify edge cleanup**
   ```bash
   memory edges hub-authentication
   ```

   **Expected Outcome**:
   - No edges to deleted memory `decision-oauth2`
   - Graph consistency maintained

**Validation**:
- ✅ Bidirectional links created correctly
- ✅ Edge labels working (forward and reverse)
- ✅ Graph visualisation generates valid Mermaid diagrams
- ✅ Edge cleanup on deletion working
- ✅ All graph operations <500ms

---

## Scenario 5: Contextual Gotcha Injection (US4)

**Goal**: Validate REQ-030 to REQ-035 (hook integration, performance <50ms)

**Success Criteria**: SC-006 (gotcha injection <50ms latency)

**Prerequisites**:
- Plugin installed and hooks active
- Gotcha memory exists tagged with "auth"
- Test project with `src/auth/` directory

**Steps**:

1. **Create gotcha memory**
   ```bash
   memory write "Watch for OAuth2 refresh race conditions" \
     --type gotcha \
     --tags auth,oauth2,concurrency
   ```

2. **Create test auth file**
   ```bash
   mkdir -p ~/test-project/src/auth
   echo "// OAuth2 login implementation" > ~/test-project/src/auth/login.ts
   ```

3. **Read auth file (trigger gotcha injection)**
   ```bash
   # In Claude session
   Read ~/test-project/src/auth/login.ts
   ```

   **Expected Outcome**:
   - File contents displayed
   - Gotcha warning injected at bottom of tool output:
     ```
     ⚠ GOTCHA (from memory)
     gotcha-oauth2-refresh:
     "Watch for OAuth2 refresh race conditions"
     Tags: auth, oauth2, concurrency
     ```
   - Latency added to Read operation: <50ms (measure with timestamp)

4. **Read another auth file (same session)**
   ```bash
   Read ~/test-project/src/auth/token.ts
   ```

   **Expected Outcome**:
   - Gotcha NOT repeated (session deduplication)
   - Message: "+ 1 gotcha suppressed (already shown)"

5. **Read non-auth file (no gotcha)**
   ```bash
   Read ~/test-project/src/utils/helpers.ts
   ```

   **Expected Outcome**:
   - No gotcha warning injected (not relevant to file path)
   - No performance impact

6. **Bash command with gotcha**
   ```bash
   # Create gotcha for dangerous git command
   memory write "Never force push to main" \
     --type gotcha \
     --tags git,force-push

   # Run bash command
   Bash git push --force origin main
   ```

   **Expected Outcome**:
   - Gotcha warning injected BEFORE command execution (PreToolUse)
   - User sees warning about force push
   - Command can still proceed (warning only, not blocked)

**Validation**:
- ✅ Gotcha injection working for file reads
- ✅ Session deduplication prevents repetition
- ✅ Tag-based matching accurate
- ✅ Performance impact <50ms
- ✅ Bash context injection working

---

## Scenario 6: Health Monitoring and Quality (US5)

**Goal**: Validate REQ-036 to REQ-042 (health checks, quality scoring, repair)

**Success Criteria**: SC-004 (100% orphan and broken link detection)

**Prerequisites**:
- Plugin installed
- Multiple memories exist with known issues (orphans, broken links)

**Steps**:

1. **Create test memories with issues**
   ```bash
   # Orphan (no hub link)
   memory write "Orphan decision" --type decision --tags orphan

   # Memory with valid link
   memory write "Valid memory" --type learning --tags valid
   memory link learning-valid-memory hub-authentication --label part-of

   # Memory to be deleted (will create broken link)
   memory write "Temporary memory" --type breadcrumb --tags temp
   memory link decision-orphan-decision breadcrumb-temporary-memory --label references
   ```

2. **Delete memory to create broken link**
   ```bash
   memory delete breadcrumb-temporary-memory --force
   ```

   **Expected Outcome**:
   - Memory deleted but edge in graph.json now broken (orphaned)

3. **Run health check**
   ```bash
   /check-memory-health
   ```

   **Expected Outcome**:
   - Report generated showing:
     - **Total memories**: Accurate count
     - **Orphan memories**: `decision-orphan-decision` detected (no hub link)
     - **Broken links**: `decision-orphan-decision → breadcrumb-temporary-memory` (target deleted)
     - **Overall health**: "Fair" or "Poor" (due to issues)
   - Suggestions provided for each issue
   - 100% of orphans and broken links detected

4. **Check quality score**
   ```bash
   memory quality learning-valid-memory
   ```

   **Expected Outcome**:
   - Score: 0-100
   - Breakdown:
     - Completeness: Score based on tags, title, content
     - Linking: Higher score (linked to hub)
     - Content: Score based on length, formatting
   - Improvement suggestions listed

5. **Check orphan quality**
   ```bash
   memory quality decision-orphan-decision
   ```

   **Expected Outcome**:
   - Lower linking score (no hub connection)
   - Suggestion: "Link to a hub memory"

6. **Run repair**
   ```bash
   memory repair
   ```

   **Expected Outcome**:
   - Broken link removed: `decision-orphan-decision → breadcrumb-temporary-memory`
   - Index validated (any missing entries regenerated)
   - Stale cache cleaned up
   - Report shows actions taken:
     - "✓ Removed 1 broken link"
     - "✓ Cleaned up 1 stale cache entry"

7. **Verify repair**
   ```bash
   /check-memory-health
   ```

   **Expected Outcome**:
   - Broken links: 0 (fixed)
   - Orphans: 1 (still orphan, but valid state)
   - Overall health improved

8. **Check embedding cache health**
   ```bash
   /check-memory-health --format json
   ```

   **Expected Outcome**:
   - JSON output includes cache status:
     - `cachedEmbeddings`: count
     - `missingEmbeddings`: count
     - `staleEmbeddings`: count

**Validation**:
- ✅ Health check detects 100% of orphans
- ✅ Health check detects 100% of broken links
- ✅ Quality scoring functional with breakdown
- ✅ Automated repair fixes broken links and stale cache
- ✅ Cache health reporting accurate

---

## Scenario 7: Plugin Installation and Backward Compatibility (Cross-Cutting)

**Goal**: Validate REQ-043, REQ-044, REQ-049 (installation, compatibility, structure)

**Success Criteria**: SC-001 (backward compatibility), SC-005 (installation <30s)

**Prerequisites**:
- Existing bash-created memories in `~/.claude/memory/`
- Claude Code installed
- Plugin repository cloned

**Steps**:

1. **Create bash-style memories (simulate existing data)**
   ```bash
   mkdir -p ~/.claude/memory
   cat > ~/.claude/memory/decision-bash-test.md << 'EOF'
   ---
   type: decision
   tags:
     - test
     - bash
   created: "2026-01-01T10:00:00Z"
   updated: "2026-01-01T10:00:00Z"
   ---

   This memory was created by the bash implementation.
   EOF
   ```

2. **Install plugin**
   ```bash
   /plugin install /path/to/memory-plugin
   ```

   **Expected Outcome**:
   - Installation completes in <30 seconds
   - Plugin appears in `/plugin list`
   - All components registered (skills, commands, agents, hooks)
   - No errors during installation

3. **Verify plugin structure**
   ```bash
   ls /path/to/memory-plugin/
   ```

   **Expected Outcome**:
   - `.claude-plugin/plugin.json` exists at root
   - `commands/`, `agents/`, `skills/`, `hooks/` at plugin root level (NOT inside `.claude-plugin/`)
   - README.md exists

4. **Read bash-created memory**
   ```bash
   memory read decision-bash-test
   ```

   **Expected Outcome**:
   - Memory loaded successfully
   - YAML frontmatter parsed correctly
   - Content displayed
   - No errors about format incompatibility

5. **List all memories (bash + plugin created)**
   ```bash
   memory list
   ```

   **Expected Outcome**:
   - Both bash-created and plugin-created memories displayed
   - No distinction (seamless compatibility)

6. **Update bash-created memory**
   ```bash
   memory write "This memory was created by bash, now updated by plugin" \
     --slug decision-bash-test \
     --type decision \
     --tags test,bash,updated
   ```

   **Expected Outcome**:
   - Memory updated successfully
   - YAML frontmatter format preserved
   - `updated` timestamp changed
   - No breaking changes to file format

7. **Verify graph.json compatibility**
   ```bash
   cat ~/.claude/memory/graph.json
   ```

   **Expected Outcome**:
   - Valid JSON adjacency list format
   - Compatible with bash implementation structure

8. **Verify index.json compatibility**
   ```bash
   cat ~/.claude/memory/index.json
   ```

   **Expected Outcome**:
   - Valid JSON index structure
   - Contains entries for both bash and plugin memories

**Validation**:
- ✅ Plugin installs in <30 seconds
- ✅ Plugin structure compliant with Claude Code spec
- ✅ 100% backward compatibility with bash-created memories
- ✅ No migration required
- ✅ YAML frontmatter format preserved exactly

---

## Scenario 8: Performance Validation (Cross-Cutting)

**Goal**: Validate REQ-045, REQ-046 (CRUD <100ms, graph <500ms)

**Success Criteria**: SC-002 (performance targets met)

**Prerequisites**:
- Plugin installed
- Test suite with 100+ memories
- Performance monitoring enabled

**Steps**:

1. **Create test dataset**
   ```bash
   for i in {1..100}; do
     memory write "Test memory $i" --type breadcrumb --tags test,perf
   done
   ```

2. **Benchmark CRUD operations (average over 100 operations)**
   ```bash
   # Write performance
   time memory write "Performance test" --type breadcrumb --tags perf

   # Read performance
   time memory read breadcrumb-performance-test

   # List performance
   time memory list

   # Delete performance
   time memory delete breadcrumb-performance-test --force
   ```

   **Expected Outcome**:
   - Write: <100ms (95th percentile)
   - Read: <100ms (95th percentile)
   - List: <100ms for up to 1000 memories
   - Delete: <100ms (95th percentile)

3. **Benchmark graph operations**
   ```bash
   # Create hub
   memory write "Performance hub" --type hub --tags perf

   # Link multiple memories to hub
   time for i in {1..10}; do
     memory link breadcrumb-test-memory-$i hub-performance-hub --label part-of
   done

   # List edges
   time memory edges hub-performance-hub

   # Generate graph
   time memory graph hub-performance-hub --depth 2
   ```

   **Expected Outcome**:
   - Link creation: <500ms per operation
   - List edges: <500ms (even with 10+ edges)
   - Graph generation: <1000ms for depth-2 traversal

4. **Benchmark semantic search (with Ollama)**
   ```bash
   time memory semantic "test query"
   ```

   **Expected Outcome**:
   - First search: <2000ms (includes embedding computation)
   - Cached search: <500ms (uses cached embeddings)

**Validation**:
- ✅ CRUD operations <100ms (95th percentile)
- ✅ Graph operations <500ms (95th percentile)
- ✅ Performance scales with dataset size (no degradation up to 1000 memories)

---

## Summary of Success Criteria Validation

| Success Criterion | Validated By | Status |
|-------------------|--------------|--------|
| **SC-001**: Backward compatibility | Scenario 7 | ✅ |
| **SC-002**: Performance <100ms CRUD, <500ms graph | Scenario 8 | ✅ |
| **SC-003**: Semantic search 80%+ relevant | Scenario 3 | ✅ |
| **SC-004**: 100% orphan/broken link detection | Scenario 6 | ✅ |
| **SC-005**: Plugin installation <30s | Scenario 7 | ✅ |
| **SC-006**: Gotcha injection <50ms | Scenario 5 | ✅ |
| **SC-007**: Scope isolation | Scenario 2 | ✅ |
| **SC-008**: Offline operation | Scenario 3 | ✅ |

---

**Quickstart Version**: 1.0.0
**Last Updated**: 2026-01-10
**Ready for**: Test-Driven Development (TDD)
