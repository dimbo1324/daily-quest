# Project Progress Tracking

Purpose: any assistant, in any session, on any model, can locate exactly where the project
stands and where it is going — **from files, not from memory**.

## Where the truth lives

| Question | File |
|---|---|
| What is planned, in what order, what is done | `docs/ROADMAP.md` |
| How the script is built right now | `docs/architecture.md` |
| Owner decisions and open questions | `docs/decisions.md` |
| What the current or last task was | `task-checklist.md` |
| What actually happened recently | `git log -15 --date=iso-strict --pretty=format:"%h %cd %s"` |
| How the rules themselves changed | `.ai/CHANGELOG.md` |
| Config format and every setting | `.ai/project/14-config-reference.md`, `config.schema.json` |

## Orientation ritual — at the start of EVERY task

1. `git status --short --branch` and
   `git log -15 --date=iso-strict --pretty=format:"%h %cd %s"`.
2. `docs/ROADMAP.md` — the first item not marked done is next unless the owner says otherwise.
3. `task-checklist.md` — what the previous task was and whether it finished cleanly.
4. `docs/decisions.md` — whether a decision changes the plan.
5. `docs/architecture.md` when the task touches code.
6. Only then plan the new task.

## Update duties when finishing work

- Finished a roadmap item → mark it done in `docs/ROADMAP.md` with the date and a one-line
  summary of what shipped.
- Changed the script's shape (a sheet, a module, a setting, a trigger, a stored property) →
  `docs/architecture.md`.
- Owner decision that constrains future work → `docs/decisions.md`, not only the chat.
- Changed a rule module → `.ai/CHANGELOG.md` and `npm run sync-agents`.
- Changed what a user installs, configures or sees → `README.md`.
- Bumped `VERSION` in `src/main.js` → same version in `package.json` and a `CHANGELOG.md`
  entry.

## Drift guard

If the plan, the state documents and the code disagree: **the code is the fact, the plan is
the intent**. Reconcile them in the same task or report the mismatch explicitly.

## Unfinished-task rule

If `task-checklist.md` still holds open `[ ]` items from a previous session, resolve them
first: finish them, or mark them `-` with an honest note.
