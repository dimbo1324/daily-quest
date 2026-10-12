# Claude Code Project Configuration

Project-scoped Claude Code configuration for Daily Quest.

Durable rules live in the shared modules under `.ai/`; `CLAUDE.md` imports them natively.
Codex and other tools get the same rules from the generated `AGENTS.md`. Subagents should
read `AGENTS.md` — it is the compiled single-file ruleset.

## Files

- `settings.json` — permission allowlist for routine read and verification commands, and a
  denylist for destructive git operations.
- `agents/` — project subagents; the source of the generated `.codex/agents/`.
- `skills/` — reusable workflows; the source of the generated `.codex/skills/`.
- `settings.local.json` — personal overrides, ignored by git.

After editing anything in `agents/` or `skills/`, run `npm run sync-agents`.

## Recommended delegation

Do task-owning work on the main thread; spawn a subagent only for independent work:

- `daily-quest-feature-planner` — scope a feature before code.
- `daily-quest-apps-script` — sheets, formulas, styling, triggers, backup and restore.
- `daily-quest-config` — config format, validation, schema, localization.
- `daily-quest-quality-reviewer` — review a diff before finalizing it.
- `daily-quest-repo-maintainer` — tooling, CI, rule sync, state documents, publishing.

## Evolving the rules

Protocol: `.ai/universal/08-rules-evolution.md`; history: `.ai/CHANGELOG.md`. Never weaken a
rule to make the current task pass.
