# Project: Daily Quest

A gamified habit and task tracker that lives inside one Google Spreadsheet: experience
points (XP), levels and ranks, daily streaks, coins and a reward shop, a dashboard with
cards and charts, and a calm dark theme. It is an open-source pet project: Google Apps Script
(V8) bound to the spreadsheet, developed locally with Node tooling and pushed with clasp.
Later parts (a second "Content Tracker" spreadsheet, maybe a web app in Python or Go) will
live in their own top-level directories.

## Sheets the script builds

`Dashboard`, `Stats` (charts, heatmap, KPI tiles), `Habits` (rows = days, columns = habits), `Rules` (same layout, things to keep
or avoid; only when rules are configured), `Routine` (schedule blocks with XP, same layout), `Schedule` (weekly routine template with
«Today»), `Tasks`, `Shop`, `Settings`, the audit log `Logs` (fixed name, kept by rebuilds) and the
hidden `_backup`. Sheet names and all UI text are English by default and can be localized
through the config's `strings` object.

## Repository map

- `src/` — the Apps Script project (clasp `rootDir`). All files share ONE global scope:
  - `main.js` — header, `VERSION`, menu, entry points (`onOpen`, `setup`, `menu*`).
  - `validation.js` — `validateCfg_`: precise config errors.
  - `config.js` — `DEFAULT_CFG` (the neutral demo config), `DAYSETS`, normalization,
    chunked persistence in document properties, calendar period.
  - `i18n.js` — `STRINGS_EN` (every UI string), `t_()`, `tq_()`, `names_()`.
  - `core.js` — layout constants, theme `TH`, utilities `U`, toasts, dialogs, `run_()` lock.
  - `trackers.js` — shared layer for the day-tracked sheets (habits, rules, routine).
  - `state.js` — snapshot (`exportState_`), backup and restore of user data.
  - `settings.js` — Settings sheet read-back, JSON import / export, config reset.
  - `build.js` — `buildAll_` and the Settings, Tasks and Shop builders.
  - `dashboard.js`, `dashboard-style.js` — the Dashboard and its styling.
  - `schedule.js` — the Schedule sheet: weekly template, «Today», Now / Next, migration.
  - `stats.js`, `stats-style.js` — the Stats sheet: KPI tiles, heatmap, charts.
  - `charts.js` — shared dark chart helpers.
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
