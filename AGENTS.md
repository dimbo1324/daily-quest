<!--
GENERATED FILE - DO NOT EDIT.
Source of truth: .ai/universal/*.md and .ai/project/*.md.
Edit a module, then run: npm run sync-agents
-->

# Daily Quest - working notes for Codex and other AI assistants

This file is the entry point for Codex and any tool that reads AGENTS.md. It is assembled
from the shared rule modules in `.ai/`, so every assistant follows identical rules. Later
sections override earlier ones; an explicit owner instruction in the current conversation
overrides everything. Start every task with the orientation ritual in the progress module.

---

<!-- module: .ai/universal/01-workflow.md -->

# Workflow: Git, Branches, Commits

Purpose: every task follows one predictable git cycle. No exceptions without an
explicit owner instruction in the current conversation.

## Branch discipline

- NEVER develop directly on `main`.
- Start every task from up-to-date `main`:
  `git checkout main` → `git pull --ff-only origin main` → `git checkout -b <branch>`.
- Branch name format: `type/short-task-description`
  (types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `ci`, `perf`, `security`).
- Uninformative branch names (`test`, `fix`, `work`, `final`, `new`) are forbidden.
- Merge into `main` only fast-forward (`git merge --ff-only`) and only after the
  project's full quality gate is green.
- Push to `origin/main` only when the owner explicitly asked for a publish within the
  current task. Work-in-progress branch pushes are allowed (for example, to publish
  the task checklist before starting work).
- Delete the task branch after it is merged.

## Commits

- Message format: `type: short description of what and why`.
- One commit = one logically complete unit. Do not mix a bug fix, a refactor,
  formatting, and new features in a single commit unless they are one inseparable task.
- Forbidden messages: `fix`, `update`, `wip`, `changes`, `final`, `123`.
- Keep commits attributable: include the assistant identity trailer the project already
  uses (check a recent `git log` for the convention).

## Quality gate before merge

- Run the project's checks (see the project commands module) before merging.
- If mandatory checks fail, merging into `main` is forbidden until fixed or the owner
  explicitly decides otherwise.
- Before merging, self-review the diff: changes match the task, no stray files, no
  debug leftovers, no secrets, no accidental unrelated edits.

When unsure whether an action counts as "explicitly requested": ask, or stop after the
branch commit and report instead of pushing.

---

<!-- module: .ai/universal/02-task-checklist.md -->

# Task Checklist and Definition of Done

Purpose: every task is planned before it starts and honestly accounted for after it
ends, in a file any reviewer can read without the conversation.

## task-checklist.md protocol

A file named `task-checklist.md` lives in the repository root and is always tracked by
git (never in `.gitignore`).

Before starting a task:

1. Clear or recreate `task-checklist.md` for the new task.
2. Write the main stages, checks, and expected outcomes as `[ ]` items, grouped into
   short sections (preparation / implementation / verification / completion).
   Moderate detail — stages, not keystrokes.
3. Commit the checklist BEFORE doing the main work.

After finishing the task:

4. Mark every item: `+` done, `-` not done or partially done.
5. Commit the filled checklist together with the completed work.
6. Never hide unfinished items — a `-` with an honest note is correct; a silently
   ignored item is a violation.

## Definition of Done

A task is complete only when ALL of the following hold:

- code written and matching the task, without unrequested scope;
- code formatted; lint and type checks pass;
- tests added or updated where reasonable; existing tests pass;
- project builds; no obvious errors in logs;
- no secrets, no temp files, no accidental changes in unrelated files;
- architecture and state docs updated if the task changed the system's shape;
- task checklist filled with `+`/`-`;
- final report written.

## Final report

The final report is ALWAYS the last step of a task. It states: what was done; which
files and areas changed; which checks ran and their results; dependency, API, database,
or config changes; security, performance, and compatibility risks; and — explicitly and
honestly — anything that was not done or failed.

---

<!-- module: .ai/universal/03-scope-and-code-style.md -->

# Scope Control and Code Style

Purpose: change only what the task requires, and keep code readable without decoration.

## Minimal changes

- Touch only what the current task needs. Forbidden without necessity:
  mass-reformatting other files, renaming things outside the task, changing
  architecture "while at it", rewriting working code without cause, changing UI when
  the task is not about the interface, deleting existing functionality without a
  direct requirement.
- If you discover an unrelated problem, record it separately (report it, or file it per
  the project's process) — do not mix it into the current diff.
- Do not create new documentation (README, `.md`, `.txt`) unless the task requires it
  directly. Exception: the project's designated architecture and progress documents,
  which must be kept current.

## Comments

- No comments by default. Code must be clear through structure and naming.
- A comment is allowed only when the task demands it, or when important logic stays
  non-obvious even with good naming. It explains the non-obvious "why", never restates
  the code.
- Stale, false, or misleading comments are forbidden. No doc comments that merely
  repeat a function name.

## File size

- Regular code files: keep under roughly 1000 lines; split by meaning when approaching
  the limit. Projects may set a stricter limit — the stricter limit wins.
- Application entry points (`main`-type files): under roughly 100 lines; extract
  configuration, startup, and service initialization into modules.
- Exemptions: test files, developer-tool scripts, and any files the project explicitly
  exempts.

## Frontend restraint

- No visual polish (styling, animations, decorative elements, redesign) unless the task
  is explicitly about appearance.
- When a task needs an interface, build the minimum that exercises the business logic
  correctly.
- Never change visual style, interface structure, component behavior, or user flows
  without a direct requirement.

---

<!-- module: .ai/universal/04-architecture-boundaries.md -->

# Architecture Boundaries, Workarounds, Tech Debt

Purpose: respect the project's layering; make every shortcut visible.

## Boundaries

- Follow the project's existing architecture. Forbidden: business logic in UI or
  controllers when a service layer exists; direct storage access in handlers when a
  repository layer exists; bypassing existing services and abstractions without cause;
  circular module dependencies; dumping unrelated logic into catch-all files.
- If the architecture genuinely blocks the task, do not hack around it — propose a
  proper structural change and reflect it in the architecture docs once approved.
- A doc-comment-only boundary is not enforced. Use a type only the check can construct,
  or a gate no caller can skip — and test that it accepts, not only that it rejects.

## Temporary solutions

- Workarounds are allowed only exceptionally, and every one must be recorded
  explicitly: why it exists, where it lives, its limits and risks, and when it must be
  replaced.
- Hidden workarounds are forbidden. Do not scatter uncontrolled `TODO`/`FIXME` marks;
  important debt gets a task or an entry in the project's tracking process.

## Tech debt

- Debt found during a task that cannot be fixed now is recorded explicitly (in the
  final report at minimum), never disguised as a normal solution.
- Debt touching security, data integrity, performance, or stability is priority debt —
  call it out loudly.

---

<!-- module: .ai/universal/05-security-and-secrets.md -->

# Security, Secrets, Dependencies, Portability

Purpose: nothing sensitive in the repo; every change safe within its area; the project
runs on any machine.

## Secrets — absolute ban

- NEVER put in code, git, tests, docs, or examples: passwords, API keys, tokens,
  private keys, real credentials, cookies, production `.env`, or personal user data.
- Secrets live only in `.env` (untracked), environment variables, secret managers, or
  CI/CD secrets. The repo may contain only a safe `.env.example`.
- A secret that ever reached git is compromised: rotate it; deleting the line in a new
  commit is not enough.

## Security in every task

Check within the area you touch: authorization and access rights, input validation,
injection, XSS and CSRF where applicable, unsafe redirects, file uploads, personal data
handling, public endpoints, token storage and transport, and access to admin functions.
Security is part of every task, not a future task.

## Dependencies

- No new dependency without justification: what for, can it be done without, is it
  maintained, known vulnerabilities, stack compatibility, does it duplicate an existing
  dependency, is it too heavy for the need.
- Never add a heavy library for one small function.
- After changing dependencies: update the lock file and verify the build.
- A new production dependency must be named in the final report.

## Portability

- No machine-specific values in code: local absolute paths, usernames, or anything
  environment-dependent. Such values go to configuration.
- The project must remain runnable by someone else using the project's documented tools.

---

<!-- module: .ai/universal/06-quality-and-testing.md -->

# Quality: Tests, Errors, Data, Contracts, Performance

Purpose: changes are verified, honest about failure, and safe to release.

## Tests

- Cover new or changed code where reasonable: the happy path, validation errors, edge
  cases, access rights, service and storage behavior, and regressions for fixed bugs.
- NEVER delete, disable, or weaken tests just to make a build green.
- If tests were not added, say why in the final report.
- Prefer the project's designated check runner over ad-hoc command sequences, and keep
  that runner updated when a task adds an important new part of the system.

## Errors and logging

- Handle errors explicitly. Forbidden: silently swallowed errors, empty catch blocks,
  debug logs left after the task, secrets or personal data in logs, print-style
  debugging instead of real handling.
- Logs must say where it broke, which component, what context matters, and how critical
  it is. Useful, not noisy.

## Database migrations

- Schema changes happen ONLY through migrations.
- Never edit or rename an already-applied migration; never delete migrations without a
  separate decision; never make irreversible changes without risk analysis.
- Verify each migration on a clean database, on an existing database where applicable,
  and together with the code that uses the new structure.

## Contracts

- When a task changes an API or an artifact format, update the contract and generated
  types.
- Never silently change field names, data types, response structure, error codes,
  parameter requiredness, or endpoint behavior.
- Any breaking change must be named explicitly in the final report.

## Performance and releases

- No premature optimization, but no obviously wasteful patterns: N+1 queries, heavy
  per-request computation, render loops, unpaginated large reads, redundant calls,
  blocking operations in responsive paths.
- If a change may affect performance, say so in the final report.
- Every change should be revertible; for risky changes plan the rollback before merging.
- Large new features ship behind a feature flag where the project supports them;
  unfinished functionality must not be reachable by accident; stale flags get removed
  after stabilization.

---

<!-- module: .ai/universal/07-multi-assistant.md -->

# Multi-Assistant Collaboration

Purpose: several AI assistants and humans work in this repository across separate
sessions; git is the coordination surface and the rule modules are shared.

## Coordination through git

- Before non-trivial work, check
  `git log -10 --date=iso-strict --pretty=format:"%h %cd %s"` and
  `git status --short --branch`: recent commits may be another assistant's finished
  work — not yours to redo or second-guess.
- Never rewrite history on another assistant's in-flight branch. Build on top of it or
  ask first.
- Keep commits attributable: include the assistant identity trailer the project already
  uses (see recent `git log` for the convention).

## Shared rule modules

- All assistants obey the same rules from `.ai/universal/` and `.ai/project/`. There is
  exactly one source of truth.
- `CLAUDE.md` imports the modules natively; `AGENTS.md` is GENERATED from them. Never
  hand-edit `AGENTS.md`; edit the module and run the project's sync command (see the
  project commands module).
- When a task changes shared behavior (workflow, gates, style, guardrails), change the
  module once — every assistant picks it up. Mirror-maintained per-assistant files
  (`.claude/` and `.codex/`: agents and skills) still need the same edit on both sides
  in the same task.

## Session hygiene for any model

- Re-read plans and rule files from disk instead of trusting memory of a previous
  session — files change between sessions.
- When context is shaky or the task is large, restate the task's acceptance criteria in
  the checklist before coding, and verify against files, not recollection.
- If two rules appear to conflict: the project module wins over the universal module;
  an explicit owner instruction in the current conversation wins over both. Say out
  loud which rule you chose and why.

---

<!-- module: .ai/project/10-project-map.md -->

# Project: Daily Quest

A gamified habit and task tracker that lives inside one Google Spreadsheet: experience
points (XP), levels and ranks, daily streaks, coins and a reward shop, a dashboard with
cards and charts, and a calm dark theme. It is an open-source pet project: Google Apps Script
(V8) bound to the spreadsheet, developed locally with Node tooling and pushed with clasp.
Later parts (a second "Content Tracker" spreadsheet, maybe a web app in Python or Go) will
live in their own top-level directories.

## Sheets the script builds

`Dashboard`, `Stats` (charts, heatmap, KPI tiles), `Habits` (rows = days, columns = habits), `Rules` (same layout, things to keep
or avoid; only when rules are configured), `Tasks`, `Shop`, `Settings`, the audit log `Logs` (fixed name, kept by rebuilds) and the
hidden `_backup`. Sheet names and all UI text are English by default and can be localized
through the config's `strings` object.

## Repository map

- `src/` — the Apps Script project (clasp `rootDir`). All files share ONE global scope:
  - `main.js` — header, `VERSION`, menu, entry points (`onOpen`, `setup`, `menu*`).
  - `config.js` — `DEFAULT_CFG` (the neutral demo config), normalization, validation,
    chunked persistence in document properties, calendar period, JSON import and export.
  - `i18n.js` — `STRINGS_EN` (every UI string), `t_()`, `tq_()`, `names_()`.
  - `core.js` — layout constants, theme `TH`, utilities `U`, toasts, dialogs, `run_()` lock.
  - `trackers.js` — shared layer for the day-tracked sheets (habits, rules).
  - `state.js` — snapshot (`exportState_`), backup and restore of user data.
  - `build.js` — building every sheet and its formulas.
  - `stats.js` — the Stats sheet: KPI tiles, heatmap, charts.
  - `logs.js` — the `Logs` audit sheet: `logEvent_`, `logEdit_`.
  - `style.js` — styling, conditional formatting, charts, soft protection.
  - `game.js` — `onEdit` reactions: XP toasts, level-ups, purchase checks.
  - `appsscript.json` — manifest: V8, minimal OAuth scopes.
- `config.example.json` — neutral demo config, identical to `DEFAULT_CFG` (tested).
- `config.schema.json` — GENERATED from `src/` by `npm run schema`; never edit by hand.
- `my-config.json` — the owner's personal config. **Git-ignored**; may contain any language.
- `tests/` — `node:test` suite; `harness.mjs` loads `src/` into a V8 context with stubs;
  `config.test.mjs` (config, i18n, trackers, stats layout), `build-smoke.test.mjs` (builders
  against a fake Spreadsheet API), `logs.test.mjs` (audit log).
- `scripts/` — repo tooling: `check-config`, `check-language`, `build-schema`, `sync-agents`.
- `docs/` — `ROADMAP.md`, `architecture.md`, `decisions.md` (state documents) and
  `manual-test-plan.md` (checks in a real spreadsheet).
- `.ai/`, `.claude/`, `.codex/`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` — assistant rules.
- `.github/` — CI (`npm run check` + forbidden-files guard), Dependabot, issue templates.

## Language policy

- **Everything tracked by git is English**: code, comments, UI defaults, docs, rule modules,
  commit messages, test names, this checklist. `npm run check:language` fails on any
  Cyrillic character in a tracked file. Owner decision 2026-10-12.
- Other languages exist only in git-ignored personal files (`my-config.json`), reaching the
  sheet through `strings` overrides.
- Reports to the owner in chat are in Russian, short and step by step.

## Product guardrails

- `@OnlyCurrentDoc`: the script touches this spreadsheet only. No new OAuth scope, external
  request or other Google service without an owner decision in `docs/decisions.md`.
- No personal data in code or tracked files. `DEFAULT_CFG` and `config.example.json` stay
  neutral, generic examples.
- User data survives every upgrade: a rebuild exports state, writes `_backup`, rebuilds,
  restores. A change that could lose ticks, tasks or purchases is a defect.
- The visual style stays dark, calm and quiet. No loud colors or decoration without a task.

---

<!-- module: .ai/project/11-commands.md -->

# Project Commands and Quality Gates

All commands run from the repository root (PowerShell or Git Bash on Windows, any POSIX
shell elsewhere). Node.js 20+; dependencies are dev-only (`npm install` once per clone).

## The one gate

```bash
npm run check        # lint + tests + config + schema + agents sync + language — CI runs this
```

| Script | Purpose |
|---|---|
| `lint` / `lint:fix` | ESLint for Apps Script (shared global scope) and Node tooling |
| `test` | `node:test` suite in `tests/` |
| `check:config` | validates `config.example.json` and a local `my-config.json` with the script's own validator |
| `check:schema` / `schema` | verify / regenerate `config.schema.json` from `src/` |
| `check:agents` / `sync-agents` | verify / regenerate `AGENTS.md` and the `.codex/` mirror |
| `check:language` | no Cyrillic in tracked files |
| `push` / `pull` / `open` | clasp: upload `src/` to the owner's Apps Script project, download, open |
| `deploy` | `check`, then `push` |

**Standing duty — keep the tooling true.** A task that changes how the project is checked,
built or published updates the matching script and this table in the same task. A source
whose artifact is generated (`config.schema.json`, `AGENTS.md`, `.codex/`) is committed
together with the regenerated artifact.

## Publishing (owner decision 2026-10-12)

- Pet project, fast loop, **no pull requests**. Work on a short task branch
  (`type/short-description`), commit in logical units, merge into `main` locally, push
  `main`. A trivial one-commit fix may go straight to `main`.
- `npm run check` is green before a merge to `main`.
- Agents push only when the owner asked for it in the current task. Never force-push `main`.

## clasp setup (once per machine)

`npm run login`, copy `.clasp.json.example` to `.clasp.json` (git-ignored) and paste the
`scriptId` from Apps Script → Project Settings; enable the Apps Script API at
script.google.com/home/usersettings. `npm run push` then uploads every file in `src/`.
Without clasp, the owner can paste each `src/*.js` file into the Apps Script editor by hand.

## Real-sheet verification

Tests cover pure logic and a smoke run of the builders against a fake API; how sheets
actually look and behave is only visible in Google Sheets. After a change to
`build.js`, `style.js`, `state.js`, `trackers.js`, `stats.js`, `logs.js` or `game.js`, keep
`docs/manual-test-plan.md` current and say in the final report which of its sections were
run in a real spreadsheet, or that none were.

---

<!-- module: .ai/project/12-domain-rules.md -->

# Domain Rules and House Style (Daily Quest)

These sharpen the universal rules for this codebase. Stricter wins.

## Apps Script code

- V8 runtime, plain script files: no modules, no `import`. Every top-level name in `src/` is
  global across files and must be unique (a test enforces it). Private helpers end in `_`
  (Apps Script hides them from the run menu); entry points called by menus, triggers or
  `google.script.run` have no underscore.
- No top-level code may depend on another file's declarations: file load order is not
  guaranteed. Read config only through `cfg_()` (lazy, cached), sheet names only through
  `names_()`, UI text only through `t_()` / `tq_()`.
- A file past roughly 600 lines is split by meaning.
- Mutating menu actions run inside `run_()` (document lock, readable errors). Destructive ones
  ask through `confirm_()` first and write a backup before touching data.
- Triggers are simple triggers (`onOpen`, `onEdit`); they must never throw and must stay fast.
- Every new user-facing operation calls `logEvent_(event, info)` with a stable kebab-case
  English event name; logging never throws and never replaces error handling.

## Formulas and the sheet

- Formulas are written in en_US syntax; `buildAll_` forces the spreadsheet locale to
  `en_US` because comma-decimal locales break them. Repeated row formulas use R1C1 via
  `setFormulasR1C1`.
- Text inside a formula goes through `tq_()` (quotes doubled). Never splice raw user text
  into a formula.
- Batch reads and writes (`getValues` / `setValues` over ranges, `writeCells_` for sparse
  layouts); no per-cell calls or range lists over calendar-sized ranges — a year-long build
  must stay well inside the 6-minute execution limit (v2.3.1 hit it).
- Only `SUMIF` / `COUNTIF` expand inside `ARRAYFORMULA`; `SUMIFS` / `COUNTIFS` do not.
- Chart options: `chartArea` takes `left`, `top` and `backgroundColor` only — Google rejects
  `right` and `bottom` and the whole build fails.
- User data is matched by date and habit name. Renaming a habit loses its old ticks — say so
  whenever a task touches habit identity.

## Configuration

- Two tiers: `DEFAULT_CFG` (= `config.example.json`, neutral) and the personal config stored
  in document properties (applied via menu «Import from JSON» from `my-config.json`).
- A new setting is added in ONE pass: `DEFAULT_CFG`, `normalizeCfg_` (legacy input),
  `validateCfg_`, `config.example.json`, `npm run schema`, a test, `docs/architecture.md`,
  and the config reference module. Old configs must keep loading.
- Validation messages are precise: which entry, which field, what is allowed.

## Internationalization

- Every user-visible string is a key in `STRINGS_EN`; code never inlines UI text.
- A new key is English in `STRINGS_EN` and appears in the regenerated schema; the owner's
  translation is added to `my-config.json` only when the owner asks (it is not tracked).
- Sheet names come from `strings`; `_backup` is fixed so backups survive a language change.

## Tests

- Pure logic (config, validation, period, i18n, storage) is covered in `tests/`. A bug fix
  in pure logic comes with a regression test.
- Never delete, skip or weaken a test to make the gate green.

## Assistant workspaces

- `.claude/agents|skills` are the source; `.codex/agents|skills` are GENERATED mirrors
  (`npm run sync-agents`). Never edit `.codex/agents` or `.codex/skills` by hand.
- `.claude/settings.json` allowlists routine read and verification commands and denies
  destructive git operations. Extend the allowlist rather than routing around it; never
  remove a deny entry without explicit owner approval.

---

<!-- module: .ai/project/13-progress-tracking.md -->

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

---

<!-- module index: extended -->

# Modules loaded on demand

These rules bind exactly like the inlined ones; only their full text lives
outside this file, to stay within the instruction budget. Read the file itself
when a task touches it — that is an obligation, not a suggestion.

## Rules Evolution: Keeping the Instructions Current

File: `.ai/universal/08-rules-evolution.md`

Never weaken a rule to make a task easier — propose changes instead; autonomous edits may only clarify or correct, never loosen; every change needs a changelog entry and a regenerated entry point.

## Time and Timestamps: Never Take a Date Without Its Moment

File: `.ai/universal/09-time-and-timestamps.md`

Read and report every date at full precision — hours, minutes, seconds, zone. For git use `--date=iso-strict` (`git log --pretty=format:"%h %cd %s"`); `--oneline`, `--date=short` and "2 days ago" never answer *when*.

## Config Reference: Format, Storage and Localization

File: `.ai/project/14-config-reference.md`

Config v2 is a JSON object of optional keys (schema: `config.schema.json`); habits, tasks and rewards are objects, v1 tuples still load; the personal config lives in chunked document properties; every UI string is overridable through `strings`.
