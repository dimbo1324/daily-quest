# Codex Project Configuration

Project-scoped Codex configuration for Daily Quest.

Rules live in the shared modules under `.ai/`. Codex reads them through the generated
`AGENTS.md` in the repository root. Claude Code gets the same rules through `CLAUDE.md`.

## Files

- `config.toml` — project-scoped model and agent defaults. No secrets; personal overrides go
  to the git-ignored `config.local.toml`.
- `agents/` — **generated** from `.claude/agents/` by `npm run sync-agents`.
- `skills/` — **generated** from `.claude/skills/` by `npm run sync-agents`.

Never edit `agents/`, `skills/` or `AGENTS.md` by hand: edit the source in `.ai/` or
`.claude/` and run `npm run sync-agents`. `npm run check` fails while they are out of sync.

## Agents

`daily-quest-feature-planner`, `daily-quest-apps-script`, `daily-quest-config`,
`daily-quest-quality-reviewer`, `daily-quest-repo-maintainer`.

## Skills

`feature-episode`, `config-change`, `code-review`, `ci-fix`, `project-maintenance`,
`rules-evolution`.
