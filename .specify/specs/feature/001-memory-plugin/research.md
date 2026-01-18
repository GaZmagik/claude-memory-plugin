# Research: Claude Code Memory Plugin

**Purpose**: Document technology evaluation and architectural decisions
**Created**: 2026-01-10
**Feature**: 001-memory-plugin

---

## Decision 1: TypeScript Build Strategy

**Chosen**: Use `tsx` for development, `tsc` for production builds

**Rationale**:
- `tsx` allows direct TypeScript execution during development without build step
- Faster iteration cycles for TDD (no wait for compilation)
- `tsc` produces optimised JavaScript for distribution
- Standard tooling, well-supported by Claude Code environment

**Alternatives Considered**:

### Option A: esbuild
- **Pros**: Extremely fast builds, single binary, tree-shaking, bundling
- **Cons**: More complex configuration, potential compatibility issues with Node.js built-ins
- **Why not chosen**: Overkill for this project. Simple tsc output is sufficient.

### Option B: Babel + TypeScript
- **Pros**: Highly configurable, mature ecosystem
- **Cons**: Slower than alternatives, complex configuration, two-step compilation
- **Why not chosen**: Unnecessary complexity. TypeScript compiler alone is sufficient.

### Option C: ts-node
- **Pros**: Simple TypeScript execution, well-established
- **Cons**: Slower than tsx, less maintained, deprecated in favour of tsx
- **Why not chosen**: tsx is the modern replacement with better performance

**Implementation**:
- `package.json` scripts: `"dev": "tsx src/index.ts"`, `"build": "tsc"`
- tsconfig.json targets ES2022 with Node16 module resolution
- Output directory: `lib/` (gitignored during development, included in distribution)

---

## Decision 2: Test Framework

**Chosen**: Vitest

**Rationale**:
- Native TypeScript support (no additional configuration needed)
- Jest-compatible API (familiar to most developers)
- Faster execution than Jest (Vite-powered)
- Better ESM support
- Built-in TypeScript coverage reporting

**Alternatives Considered**:

### Option A: Jest
- **Pros**: Most popular, extensive ecosystem, mature, well-documented
- **Cons**: Slower than Vitest, requires ts-jest for TypeScript, ESM support is clunky
- **Why not chosen**: Slower test execution impacts TDD feedback loop

### Option B: Node.js built-in test runner
- **Pros**: No dependencies, built into Node.js 18+, simple
- **Cons**: Limited assertion library, no coverage reporting, immature ecosystem
- **Why not chosen**: Insufficient tooling for comprehensive test suite

### Option C: AVA
- **Pros**: Fast, concurrent by default, TypeScript support
- **Cons**: Smaller ecosystem, different API from Jest, less familiar
- **Why not chosen**: Vitest offers similar performance with more familiar API

**Implementation**:
- `vitest.config.ts` with coverage configuration
- Test files: `*.test.ts` alongside source files or in `__tests__/` directories
- TDD workflow: `vitest --watch` during development

---

## Decision 3: Embedding Provider Strategy

**Chosen**: Ollama with graceful degradation, configurable models

**Rationale**:
- Local-first approach (privacy-preserving, no external API costs)
- Open-source models (embeddinggemma, nomic-embed-text)
- Simple HTTP API (no complex client libraries)
- Fallback to keyword search when unavailable (offline operation)
- User can configure alternative embedding providers via config.json

**Alternatives Considered**:

### Option A: OpenAI Embeddings API
- **Pros**: High-quality embeddings, well-documented, reliable
- **Cons**: Requires API key, costs money, privacy concerns, internet dependency
- **Why not chosen**: Violates local-first principle. Costs prohibit widespread adoption.

### Option B: Local Sentence Transformers (Python)
- **Pros**: High quality, offline, no external dependencies
- **Cons**: Requires Python runtime, large model files, slower than Ollama
- **Why not chosen**: Python dependency adds complexity. Ollama is faster and easier to install.

### Option C: In-process embeddings (TensorFlow.js)
- **Pros**: No external dependencies, pure JavaScript, portable
- **Cons**: Large bundle size, slower than native implementations, limited model selection
- **Why not chosen**: Performance and bundle size concerns. Ollama is better optimised.

### Option D: No embeddings (keyword search only)
- **Pros**: Zero dependencies, works offline always, simple
- **Cons**: Lower search quality, misses conceptually related memories
- **Why not chosen**: Semantic search is a key value proposition. Graceful degradation preserves this.

**Ollama Detection Strategy**:
1. On semantic search request, check if Ollama is reachable at configured endpoint (default: `http://localhost:11434`)
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

**Config Schema** (`~/.claude/memory/config.json` or `.claude/memory/config.json`):
```json
{
  "embedding": {
    "provider": "ollama",
    "endpoint": "http://localhost:11434",
    "model": "embeddinggemma",
    "fallbackModels": ["nomic-embed-text", "all-minilm"],
    "cacheDirectory": ".embedding-cache"
  },
  "scopes": {
    "default": "auto",
    "enterprise": {
      "enabled": false
    }
  }
}
```

---

## Decision 4: Graph Storage Format

**Chosen**: Adjacency list in graph.json (Map<string, Edge[]>)

**Rationale**:
- Simple and human-readable JSON format
- Efficient for single-node operations (O(1) lookup)
- Bidirectional edges stored explicitly (forward and reverse)
- Supports labelled edges with timestamps
- Easy to validate and repair programmatically

**Alternatives Considered**:

### Option A: Adjacency matrix
- **Pros**: Fast for dense graphs, simple to implement
- **Cons**: Memory-inefficient for sparse graphs, O(V²) space complexity
- **Why not chosen**: Memory graphs are sparse (few edges per node)

### Option B: Edge list (flat array of edges)
- **Pros**: Simple to implement, memory-efficient
- **Cons**: O(E) lookup for node edges, requires filtering on every query
- **Why not chosen**: Poor performance for common operations (list edges for node)

### Option C: Graph database (e.g., Neo4j, SQLite)
- **Pros**: Powerful queries, ACID guarantees, traversal optimisation
- **Cons**: External dependency, overkill for use case, adds complexity
- **Why not chosen**: JSON file is sufficient. No need for external database.

**Graph Schema**:
```typescript
interface Edge {
  target: string;        // Target memory slug
  label: string;         // Relationship label (e.g., "implements", "relates-to")
  timestamp: string;     // ISO 8601 creation timestamp
}

interface Graph {
  [memoryId: string]: Edge[];
}
```

**Example graph.json**:
```json
{
  "decision-oauth2": [
    { "target": "learning-token-refresh", "label": "implements", "timestamp": "2026-01-10T10:00:00Z" },
    { "target": "hub-authentication", "label": "part-of", "timestamp": "2026-01-10T10:05:00Z" }
  ],
  "learning-token-refresh": [
    { "target": "decision-oauth2", "label": "implemented-by", "timestamp": "2026-01-10T10:00:00Z" }
  ]
}
```

---

## Decision 5: Scope Resolution Order

**Chosen**: Waterfall check (enterprise → local → project → global)

**Rationale**:
- Most specific scope takes precedence
- Predictable behaviour for users
- Enterprise can override project/global for compliance
- Local can override project for personal customisation
- Simple to implement and explain

**Alternatives Considered**:

### Option A: Merge all scopes equally
- **Pros**: Access to all memories simultaneously
- **Cons**: No precedence, conflicts hard to resolve, unpredictable
- **Why not chosen**: Conflicts between scopes need clear resolution rules

### Option B: User-selected scope only (no fallback)
- **Pros**: Explicit, no ambiguity
- **Cons**: Requires user to always specify scope, verbose
- **Why not chosen**: Poor UX. Smart defaults improve usability.

### Option C: Global-first (global → project → local → enterprise)
- **Pros**: Common memories prioritised
- **Cons**: Enterprise can't enforce policies, local can't override project
- **Why not chosen**: Violates principle of most-specific-wins

**Default Scope Selection Logic**:
```typescript
function getDefaultScope(): Scope {
  if (isInGitRepo() && !isGlobalContext()) {
    return 'project';  // Default to project when in git repo
  }
  return 'global';  // Otherwise default to global
}
```

**Scope Merge Behaviour** (for list/search operations):
```typescript
function mergeScopes(query: SearchQuery): Memory[] {
  const scopes: Scope[] = [];
  if (isEnterpriseEnabled()) scopes.push('enterprise');
  scopes.push('local', 'project', 'global');

  return scopes
    .flatMap(scope => searchInScope(scope, query))
    .filter(unique)  // Deduplicate by slug (most specific scope wins)
    .map(memory => ({ ...memory, scope }));  // Tag with source scope
}
```

---

## Decision 6: YAML Frontmatter Format

**Chosen**: Preserve existing bash-implementation format exactly

**Rationale**:
- Backward compatibility with existing memories (no migration required)
- Proven format, already understood by users
- Standard YAML parsing libraries available (js-yaml)
- Human-readable and editable

**Format**:
```yaml
---
type: decision
tags:
  - auth
  - oauth2
created: "2026-01-10T10:00:00Z"
updated: "2026-01-10T10:30:00Z"
links:
  - learning-token-refresh
  - hub-authentication
---

Memory content goes here in Markdown.
```

**Required Fields**:
- `type`: One of decision, learning, artifact, gotcha, breadcrumb, hub
- `tags`: Array of lowercase, hyphenated tags
- `created`: ISO 8601 timestamp
- `updated`: ISO 8601 timestamp

**Optional Fields**:
- `links`: Array of linked memory slugs
- Custom fields allowed (preserved when reading/writing)

**Implementation**: Use `js-yaml` library for parsing and stringifying
```typescript
import yaml from 'js-yaml';

interface Frontmatter {
  type: MemoryType;
  tags: string[];
  created: string;
  updated: string;
  links?: string[];
  [key: string]: unknown;  // Allow custom fields
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Invalid frontmatter format');

  const frontmatter = yaml.load(match[1]) as Frontmatter;
  const body = match[2];
  return { frontmatter, body };
}
```

---

## Decision 7: Slug Generation Algorithm

**Chosen**: Type-prefixed, URL-safe, collision-resistant

**Rationale**:
- Type prefix provides visual categorisation (decision-, learning-, hub-)
- URL-safe for potential web integration
- Collision detection prevents overwrites
- Predictable from title (decision-oauth2 from "OAuth2 Decision")

**Algorithm**:
```typescript
function generateSlug(title: string, type: MemoryType): string {
  // 1. Lowercase
  let slug = title.toLowerCase();

  // 2. Replace spaces and special chars with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, '-');

  // 3. Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  // 4. Add type prefix
  slug = `${type}-${slug}`;

  // 5. Check for collision
  let finalSlug = slug;
  let counter = 1;
  while (memoryExists(finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  return finalSlug;
}
```

**Examples**:
- "OAuth2 Decision" → `decision-oauth2`
- "Token Refresh Pattern" → `learning-token-refresh-pattern`
- "Auth Hub" → `hub-auth`
- "OAuth2 Decision" (duplicate) → `decision-oauth2-1`

**Alternatives Considered**:

### Option A: UUID-based slugs
- **Pros**: Guaranteed unique, no collision detection needed
- **Cons**: Not human-readable, hard to reference
- **Why not chosen**: Poor UX. Users reference memories by slug in commands.

### Option B: No type prefix
- **Pros**: Shorter slugs
- **Cons**: No visual categorisation, higher collision risk
- **Why not chosen**: Type prefix aids discoverability and categorisation

---

## Decision 8: Hook Performance Optimisation

**Chosen**: Index-based lookups, session caching, early exit

**Rationale**:
- Gotcha injection must add <50ms latency (REQ-035)
- Index provides O(1) lookup by tag
- Session cache avoids repeated gotcha searches
- Early exit when no gotchas match file pattern

**Optimisation Strategy**:

1. **Index-based tag matching**:
   ```typescript
   // Build inverted index at session start
   const tagIndex: Map<string, Set<string>> = new Map();
   for (const memory of allMemories) {
     if (memory.type === 'gotcha') {
       for (const tag of memory.tags) {
         if (!tagIndex.has(tag)) tagIndex.set(tag, new Set());
         tagIndex.get(tag)!.add(memory.slug);
       }
     }
   }

   // O(1) lookup during file read
   function findRelevantGotchas(filePath: string): Gotcha[] {
     const tags = extractTagsFromPath(filePath);  // e.g., src/auth/login.ts → ['auth', 'login']
     const candidates = tags.flatMap(tag => Array.from(tagIndex.get(tag) || []));
     return candidates.slice(0, 3);  // Top 3
   }
   ```

2. **Session deduplication cache**:
   ```typescript
   const shownGotchas: Set<string> = new Set();

   function injectGotchas(filePath: string): string[] {
     const gotchas = findRelevantGotchas(filePath)
       .filter(g => !shownGotchas.has(g.slug));

     gotchas.forEach(g => shownGotchas.add(g.slug));
     return gotchas.map(formatGotchaWarning);
   }
   ```

3. **Early exit**:
   ```typescript
   function shouldInjectGotchas(toolName: string, args: unknown): boolean {
     if (toolName !== 'Read' && toolName !== 'Bash') return false;
     if (toolName === 'Read' && !isCodeFile(args.file_path)) return false;
     return true;
   }
   ```

**Performance Budget**:
- Index build: <200ms at session start (acceptable one-time cost)
- Tag lookup: <5ms (hash table lookup)
- Gotcha formatting: <10ms (string formatting)
- Total latency: <50ms (within requirement)

---

## Decision 9: Plugin Distribution Strategy

**Chosen**: Git repository with pre-built lib/ directory

**Rationale**:
- Simple installation: `/plugin install <git-url>`
- No build step required for users (pre-built JavaScript included)
- Source TypeScript available for contributors
- Standard Claude Code plugin installation flow

**Distribution Checklist**:
- [ ] Include compiled `lib/` directory in git (normally gitignored)
- [ ] `.claude-plugin/plugin.json` with correct version
- [ ] README.md with installation and usage instructions
- [ ] package.json with dependencies (but users don't need to `npm install`)
- [ ] All TypeScript source in `src/` for contributors

**Alternative for Advanced Users** (future consideration):
- Publish to npm registry for version management
- Users can `npm install @claude/memory-plugin`
- Claude Code plugin system can install from npm
- Not required for MVP

---

## Open Questions

### Q1: Should we support multiple embedding providers beyond Ollama?

**Status**: Deferred to post-MVP

**Rationale**: Ollama covers 90% of use cases. Adding OpenAI/Cohere support is straightforward via adapter pattern if demand emerges. YAGNI principle applies.

**Future implementation path**:
```typescript
interface EmbeddingProvider {
  isAvailable(): Promise<boolean>;
  generateEmbedding(text: string): Promise<number[]>;
}

class OllamaProvider implements EmbeddingProvider { /* ... */ }
class OpenAIProvider implements EmbeddingProvider { /* ... */ }
```

### Q2: Should we implement real-time index updates or batch rebuilds?

**Status**: Real-time updates for CRUD, batch rebuild on corruption

**Rationale**:
- CRUD operations update index immediately (consistency)
- Full rebuild only on corruption detection or manual trigger
- Best of both worlds: consistency + repair capability

### Q3: Should we support custom memory types beyond the standard 6?

**Status**: No (v1.0.0), consider for v2.0.0 if demand exists

**Rationale**:
- Six types cover known use cases (decision, learning, artifact, gotcha, breadcrumb, hub)
- Custom types add validation complexity
- Users can use tags for additional categorisation
- YAGNI: wait for proven demand before adding

---

## Decision 10: Enterprise Scope Configuration

**Chosen**: Use `CLAUDE_MEMORY_ENTERPRISE_PATH` environment variable via managed-settings.json

**Research Date**: 2026-01-10

**Background**:
Claude Code's `managed-settings.json` is the official enterprise policy mechanism. It resides in system directories requiring admin privileges and cannot be overridden by user/project settings.

**Managed-settings.json Locations**:
- **macOS**: `/Library/Application Support/ClaudeCode/managed-settings.json`
- **Linux/WSL**: `/etc/claude-code/managed-settings.json`
- **Windows**: `C:\Program Files\ClaudeCode\managed-settings.json`

**Key Finding**: There is no standard `memory.enterprisePath` setting in Claude Code. We must define our own convention.

**Chosen Approach**:
```json
{
  "env": {
    "CLAUDE_MEMORY_ENTERPRISE_PATH": "/etc/claude-code/memory"
  }
}
```

**Rationale**:
- Uses standard Claude Code mechanism (`env` key in managed-settings.json)
- Environment variable is discoverable via `process.env`
- No custom settings schema required
- Follows Claude Code conventions for enterprise configuration
- IT admins can deploy without understanding plugin internals

**Settings Precedence** (highest to lowest):
1. Managed settings (managed-settings.json) - **Cannot be overridden**
2. Command line arguments
3. Local project settings (.claude/settings.local.json)
4. Shared project settings (.claude/settings.json)
5. User settings (~/.claude/settings.json)
6. Built-in defaults

**Implementation**:
```typescript
function getEnterprisePath(): string | null {
  const enterprisePath = process.env.CLAUDE_MEMORY_ENTERPRISE_PATH;
  if (!enterprisePath) return null;

  // Validate path exists and is accessible
  if (!fs.existsSync(enterprisePath)) {
    console.warn(`Enterprise memory path not accessible: ${enterprisePath}`);
    return null;
  }

  return enterprisePath;
}
```

**Alternatives Considered**:

### Option A: Custom settings key (e.g., `memory.enterprisePath`)
- **Pros**: More explicit, self-documenting
- **Cons**: Not a standard Claude Code setting, would be ignored by managed-settings.json
- **Why not chosen**: Managed-settings.json only supports documented settings schema

### Option B: Hook-based discovery
- **Pros**: Flexible, could query enterprise directory services
- **Cons**: Complex, requires hook deployment, potential security concerns
- **Why not chosen**: Overkill for path configuration, env var is simpler

### Option C: Hardcoded enterprise paths
- **Pros**: Zero configuration
- **Cons**: Inflexible, assumes enterprise uses our chosen paths
- **Why not chosen**: Organisations have different directory standards

**Documentation Requirement**:
README.md must include enterprise deployment section explaining:
1. How to set `CLAUDE_MEMORY_ENTERPRISE_PATH` in managed-settings.json
2. Required directory structure at enterprise path
3. Permissions requirements (read for all users, write for admins)

---

## Sources

- [Claude Code Plugin Documentation](https://code.claude.com/docs/en/plugins)
- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings)
- [Claude Code IAM Documentation](https://code.claude.com/docs/en/iam)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Ollama Embedding Models](https://ollama.com/library?sort=popular&query=embedding)
- [js-yaml Documentation](https://github.com/nodeca/js-yaml)
- [Claude Code Settings Hierarchy](https://code.claude.com/docs/en/settings)
- [Semantic Versioning](https://semver.org/)

---

**Research Completed**: 2026-01-10
**Decisions Resolved**: 9/9
**Open Questions**: 3 (all deferred or resolved)
**Ready for**: Implementation (Phase 1)
