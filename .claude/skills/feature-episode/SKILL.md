---
name: feature-episode
description: Use to carry one Daily Quest feature or roadmap item from orientation to a merged, pushed result — checklist, implementation, checks, state documents, report.
---

# Feature Episode

One task, start to finish. Rules: `AGENTS.md` (Claude Code loads them via `CLAUDE.md`).

## 1. Orient

```bash
git status --short --branch
git log -15 --date=iso-strict --pretty=format:"%h %cd %s"
```

Read `docs/ROADMAP.md`, `task-checklist.md`, `docs/decisions.md`, `docs/architecture.md`.
For a non-trivial feature, delegate scoping to `daily-quest-feature-planner`.

## 2. Plan

`git switch main`, `git pull --ff-only`, `git switch -c feat/<short-name>`. Rewrite
`task-checklist.md` for the task (`[ ]` items: preparation, implementation, verification,
completion) and commit it first.

## 3. Implement

- Sheets and triggers: follow the `daily-quest-apps-script` agent rules.
- New settings or UI text: follow the `config-change` skill.
- Commit in logical units with `type: what and why` messages and the assistant trailer.

## 4. Verify

`npm run check` green. Review the diff with the `code-review` skill (or the
`daily-quest-quality-reviewer` agent). Note what needs a real spreadsheet to verify.

## 5. Close

- `docs/ROADMAP.md`, `docs/architecture.md`, `docs/decisions.md`, `README.md`,
  `CHANGELOG.md` as the task requires; a version bump if users get new behavior.
- Fill `task-checklist.md` with `+` / `-` honestly and commit it with the work.
- If the owner asked to publish: `git switch main`, `git merge --no-ff feat/<short-name>`,
  `npm run check`, `git push origin main`.
- Final report to the owner in Russian: what changed, how to apply it in the sheet, what was
  not verified.
