---
name: project-maintenance
description: Use for routine Daily Quest upkeep — the quality gate, generated artifacts, rule sync, state documents, versions, dependency updates, and explicitly requested publishing.
---

# Repository Maintenance

## Fast paths

```bash
npm run check          # the gate (CI runs it)
npm run sync-agents    # AGENTS.md + .codex mirror from .ai/ and .claude/
npm run schema         # config.schema.json from src/
npm run push           # clasp: upload src/ to the owner's Apps Script project
```

## Rules

- Generated, never hand-edited: `AGENTS.md`, `.codex/agents/*`, `.codex/skills/*`,
  `config.schema.json`. Edit the source, regenerate, commit both together.
- The `AGENTS.md` budget is 30 KiB: tighten a module, or mark a situational one
  `<!-- tier: extended -->` with an `> **Essence.**` line (moving tiers needs owner approval).
- Rule changes follow the `rules-evolution` skill, including `.ai/CHANGELOG.md`.
- `.claude/settings.json`: extending the allowlist is fine; removing a deny entry needs
  explicit owner approval.
- Versions move together: `VERSION` in `src/main.js`, `package.json`, `CHANGELOG.md`.
- Dependencies are dev-only. A new one needs a reason; update `package-lock.json`.

## State documents

Roadmap item done → `docs/ROADMAP.md`. Shape changed → `docs/architecture.md`. Owner
decision → `docs/decisions.md`. Task closed → `task-checklist.md` with honest `+`/`-` marks.

## Publishing

No pull requests. Merge the task branch into `main` locally after a green gate and push
`main` — only when the owner asked in the current task.
