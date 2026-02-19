# Speckit Specifier Agent Memory

## Key Learnings

### Script permissions
The `.specify/scripts/bash/create-new-feature.sh` script may lack execute permissions.
When it fails with "Permission denied", create the feature branch and directory manually:
```bash
git checkout -b feature/004-<name>
mkdir -p .specify/specs/feature/004-<name>/checklists
```

### Memory write piping
`memory write` requires JSON on stdin. In this shell environment, `echo '...' | memory write` fails
because the shell doesn't pass stdin correctly. Workaround: write JSON to a temp file, then
`memory write < /tmp/file.json`.

## Completed Specs

- **004** — v1.5.0 Memory Graph Enhancement Suite (`feature/004-v1.5.0-memory-graph-enhancements`)
  - Four features: similarity on edges (P1), update-edge (P2), check-relevance (P3), LLM verification (P4)
  - All three open questions resolved; checklist PASSED
  - Ready for `/speckit:plan`
