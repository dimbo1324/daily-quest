# Daily Quest — working notes for Claude Code

This file is the Claude Code entry point. All rules live in shared modules under `.ai/` —
the single source of truth for every AI assistant in this repository. Codex and other tools
read the same modules through the generated `AGENTS.md`; never edit that file by hand (edit
a module, then run `npm run sync-agents`).

Later modules override earlier ones; an explicit owner instruction in the current
conversation overrides everything.

## Starting a fresh session

Sessions often begin with no context. Before any work, run the **orientation ritual** from
`@.ai/project/13-progress-tracking.md`: git status and log → `docs/ROADMAP.md` →
`task-checklist.md` → `docs/decisions.md` → `docs/architecture.md` when touching code.

**One gate for everything:** `npm run check` (lint, tests, config, schema, agent sync,
language). CI runs the same command. Details: `@.ai/project/11-commands.md`.

**Talking to the owner:** answers in Russian, short and step by step, code as whole files,
and say where to click in Google Sheets. Everything committed to the repository is English.

The rules are meant to evolve: see `@.ai/universal/08-rules-evolution.md` for when and how to
change them, and `.ai/CHANGELOG.md` for what changed so far.

## Universal rules (portable to any project)

- @.ai/universal/01-workflow.md
- @.ai/universal/02-task-checklist.md
- @.ai/universal/03-scope-and-code-style.md
- @.ai/universal/04-architecture-boundaries.md
- @.ai/universal/05-security-and-secrets.md
- @.ai/universal/06-quality-and-testing.md
- @.ai/universal/07-multi-assistant.md
- @.ai/universal/08-rules-evolution.md
- @.ai/universal/09-time-and-timestamps.md

## Project rules (Daily Quest)

- @.ai/project/10-project-map.md
- @.ai/project/11-commands.md
- @.ai/project/12-domain-rules.md
- @.ai/project/13-progress-tracking.md
- @.ai/project/14-config-reference.md

## Claude Code workspace

- `.claude/settings.json` — permission allow and deny lists.
- `.claude/agents/` — project subagents (`daily-quest-*`); the source of the generated
  `.codex/agents/` mirror.
- `.claude/skills/` — reusable workflows (`feature-episode`, `config-change`, `code-review`,
  `ci-fix`, `project-maintenance`, `rules-evolution`); the source of `.codex/skills/`.
