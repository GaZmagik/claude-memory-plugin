/**
 * CLI Help Text
 *
 * Generates help text for the memory CLI.
 * Mirrors the shell implementation's help command.
 */

/**
 * Compact help text (default)
 */
export const HELP_COMPACT = `Memory Skill - Store and manage markdown memories

COMMANDS:
  archive <id>        Archive a memory
  audit [scope]       Bulk quality scan (--threshold, --deep)
  audit-quick [scope] Fast deterministic-only audit
  bulk-delete         Delete multiple memories matching criteria
  bulk-link [file]    Create multiple links from JSON input
  delete <id>         Delete a memory
  demote <id> <type>  Reverse conversion (gotcha->learning, etc)
  edges <id>          Show inbound and outbound edges for a node
  export [scope]      Export memories to JSON file
  graph [scope]       Output the memory graph as JSON
  health [scope]      Quick health check
  help                Show this help (use 'help <cmd>' for details)
  impact <id>         Show what depends on a memory
  import <file>       Import memories from JSON (--merge or --replace)
  link <from> <to>    Create a relationship between memories
  list [type] [tag]   List memories (optionally filter by type or tag)
  mermaid [options]   Generate Mermaid diagram of memory graph
  move <id> <scope>   Move memory between scopes
  promote <id> <type> Convert memory type (learning->gotcha, etc)
  prune               Remove expired temporary memories
  quality <id>        Assess quality score for a memory (--deep for LLM)
  query [options]     Query memories with filters (type, tags, edges)
  read <id>           Read a memory by ID
  rebuild [scope]     Rebuild graph and index from disk (use with caution)
  refresh [scope]     Backfill missing frontmatter fields (id, project)
  reindex <id>        Re-index an orphan file
  remove-node <id>    Remove a node from graph (keeps file)
  rename <old> <new>  Rename a memory ID (updates all references)
  repair [scope]      Run sync then validate
  search <query>      Search memories by title or content
  semantic <query>    Search memories by meaning using embeddings
  stats [scope]       Show graph statistics (ratio, hubs, sinks)
  status              Show memory system status
  suggest-links       Suggest potential relationships
  summarize [type]    Generate summary of memories
  sync [scope]        Synchronise graph, index, and disk
  sync-frontmatter    Bulk sync frontmatter from graph.json
  tag <id> <tags>     Add tags to a memory
  think <subcommand>  Deliberation workspace (see THINK COMMANDS below)
  unlink <from> <to>  Remove a relationship between memories
  untag <id> <tags>   Remove tags from a memory
  validate [scope]    Detailed validation with issue detection
  write               Create or update a memory (JSON from stdin)

THINK COMMANDS (ephemeral deliberation before decisions):
  think create <topic>     Start a new thinking document
  think add <thought>      Add a thought (--by <author>, --call <agent>)
  think counter <thought>  Add counter-argument
  think branch <thought>   Add alternative exploration branch
  think list               List all thinking documents
  think show [id]          Show document contents
  think use <id>           Switch to a different document
  think conclude <text>    Conclude deliberation (--promote <type>)
  think delete <id>        Delete a thinking document

SCOPE:
  user               User-level memories (~/.claude/memory/)
  project            Project memories in git (.claude/memory/)
  local              Local project memories, gitignored (.claude/memory/local/)
  enterprise         Enterprise memories (managed environments)

EXAMPLES:
  echo '{"id":"my-decision","title":"Use Postgres","type":"permanent","content":"..."}' | memory write
  memory list permanent
  memory search "database"
  memory link my-decision related-learning
  memory validate project

Use 'memory help --full' for detailed documentation.
`;

/**
 * Full help text (detailed documentation)
 */
export const HELP_FULL = `${HELP_COMPACT}

DETAILED COMMAND REFERENCE:

CRUD Operations:
  write              Create or update a memory from JSON stdin
                     Required fields: title, content, type
                     Optional: id (auto-generated), tags, links, scope
                     Flags: --auto-link, --auto-link-threshold <n>

  read <id>          Read a memory by its ID
                     Returns: frontmatter + content as JSON

  list [type] [tag]  List all memories, optionally filtered
                     Types: permanent, temporary
                     Flags: --scope <scope>, --limit <n>

  delete <id>        Delete a memory and remove from graph/index
                     Flags: --force (skip confirmation)

  search <query>     Full-text search across titles and content
                     Flags: --scope <scope>, --limit <n>, --type <type>

  semantic <query>   Search by meaning using embeddings (requires Ollama)
                     Flags: --threshold <n>, --limit <n>, --scope <scope>

Graph Operations:
  link <from> <to>   Create directed edge between memories
                     Flags: --relation <type>

  unlink <from> <to> Remove edge between memories

  edges <id>         Show all inbound and outbound edges for a node

  graph [scope]      Export full graph as JSON

  mermaid [options]  Generate Mermaid diagram
                     Flags: --direction <TB|LR>, --include-orphans

  remove-node <id>   Remove node from graph (file remains on disk)

  bulk-link [file]   Create multiple links from JSON
                     Input: [{source, target, relation?}, ...]

Tag Operations:
  tag <id> <tags...>   Add one or more tags to a memory
  untag <id> <tags...> Remove tags from a memory

Quality & Health:
  health [scope]     Quick connectivity check with score
  validate [scope]   Detailed validation with issue detection
  quality <id>       Assess single memory quality (Tier 1-3)
                     Flags: --deep (include LLM checks)
  audit [scope]      Bulk quality scan
                     Flags: --threshold <n>, --deep
  audit-quick [scope] Fast deterministic-only scan

Maintenance:
  sync [scope]       Reconcile graph, index, and disk files
  repair [scope]     Run sync then validate
  rebuild [scope]    Full reconstruction from disk (destructive)
  reindex <id>       Re-index an orphan file
  prune              Remove expired temporary memories

Utility:
  rename <old> <new> Rename memory ID, updating all references
  move <id> <scope>  Move memory to different scope
  promote <id> <type> Convert to different memory type
  demote <id> <type>  Alias for promote (reverse conversion)
  archive <id>       Archive a memory
  status             Show system status summary
  stats [scope]      Graph statistics (connectivity, hubs, sinks)

Thinking Documents:
  think create <topic>     Create new ephemeral thinking document
  think add <thought>      Add thought to current document
                           Flags: --by <author>, --call <agent>, --style <style>
  think counter <thought>  Add counter-argument
  think branch <thought>   Add alternative branch
  think list               List all thinking documents
  think show [id]          Show document contents
  think use <id>           Switch current document
  think conclude <text>    Conclude document
                           Flags: --promote <type>
  think delete <id>        Delete thinking document

Export/Import:
  export [scope]     Export memories to JSON snapshot
                     Flags: --output <file>
  import <file>      Import from JSON snapshot
                     Flags: --merge, --replace (default: merge)

Advanced:
  query [options]    Complex filtering
                     Flags: --type, --tags, --has-edges, --orphans
  suggest-links      Find potential relationships using embeddings
                     Flags: --threshold <n>, --auto-link
  summarize [type]   Generate summary rollups
  impact <id>        Show dependency tree for a memory
                     Flags: --depth <n>, --json
`;

/**
 * Get help text
 *
 * @param full - Whether to show full documentation
 */
export function getHelpText(full = false): string {
  return full ? HELP_FULL : HELP_COMPACT;
}
