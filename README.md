# daily-quest

[![CI](https://github.com/dimbo1324/daily-quest/actions/workflows/ci.yml/badge.svg)](https://github.com/dimbo1324/daily-quest/actions/workflows/ci.yml)

Gamified habit & task tracker for Google Sheets (Apps Script): daily habits, rules to keep
or avoid, tasks, XP, levels, streaks, coins and a reward shop, dashboard with charts, dark UI,
auto-backup and state-preserving upgrades.
English UI out of the box, fully localizable through the config.

## Install

**With clasp (recommended):** see [Development](#development), then `npm run push`.

**By hand:** new Google Sheet → Extensions → Apps Script → create one script file per file in
`src/` (same names, paste the contents) and replace `appsscript.json` (Project Settings →
show the manifest) → Save.

Then run `setup` once:

1. In the spreadsheet: **Extensions → Apps Script** (with clasp: `npm run open`).
2. In the toolbar, pick `setup` in the function drop-down and press **▶ Run**.
3. **Review permissions** → choose your account → **Advanced** → **Go to the project** → **Allow**
   (the script only touches this spreadsheet: `@OnlyCurrentDoc`).
4. Reload the spreadsheet tab → the **🎮 Daily Quest** menu appears.

A year-long calendar takes 1–3 minutes to build. If a build is ever interrupted, run
**♻️ Rebuild** again: it rebuilds from the backup.

## Configure it (no code edits)

Two configs:

| File | In git | Purpose |
|---|---|---|
| `config.example.json` | yes | neutral demo config, identical to the built-in defaults |
| `my-config.json` | **no** (ignored) | your personal config: habits, rules, tasks, rewards, dates, UI language |

1. Copy `config.example.json` to `my-config.json` and edit it. Editors with JSON Schema
   support (VS Code) autocomplete and validate it through `config.schema.json`.
2. `npm run check:config` validates it with the script's own validator.
3. In the sheet: menu **⚙️ Settings → 📥 Import from JSON**, paste the file. The tracker is
   rebuilt and your data is kept (a year-long calendar takes 1–3 minutes).

Highlights:

- `startDate` / `endDate` pin the calendar (for example one year); otherwise it starts on the
  first build and runs `daysToCreate` days, extending itself by 30 days as it nears the end.
- `strings` overrides any UI text, sheet names included — this is how you translate the
  sheet. The keys and English defaults are listed in `config.schema.json`.
- `rules` lists things to keep or to avoid (`kind: "keep" | "avoid"`), tracked day by day on
  the Rules sheet: tick a rule when you kept it. Each rule shows its clean streak on the
  Dashboard.
- The **Stats** sheet shows KPI tiles, a 26-week completion heatmap and charts of your
  progress (up to eight with rules and routine blocks); it updates live.
- The **Schedule** sheet is your weekly routine: time blocks per day set (or a one-off date),
  an activity from a drop-down (`activities`, editable on the Settings sheet) or your own
  text, «Today» with Now / Next, planned hours per week. Blocks with XP are ticked daily on
  the **Routine** sheet for XP, a streak and a perfect-day bonus. It survives rebuilds.
- The **Logs** sheet records every edit and every operation (with time, old and new value,
  imported JSON) so anything can be reconstructed; it survives rebuilds.
- Habits and rules can also be edited on the `Settings` sheet → menu **♻️ Rebuild**.
- **⚙️ Settings → 📤 Export to JSON** writes the effective config back for `my-config.json`.

## Upgrade

1. **With clasp:** `npm run push`. **By hand:** compare the file list in the Apps Script
   editor with `src/` — add every new file, update every changed one, delete files that no
   longer exist in `src/` (the CHANGELOG names new modules).
2. In the sheet: menu **♻️ Rebuild (data is kept)**.

Ticks, tasks, purchases and the schedule are kept (backup in the hidden sheet `_backup`).
**🛟 Restore from backup** brings the backup back and keeps the state before it as the new
backup, so restoring again undoes it. Ticks are matched by date and item name, so renaming a
habit, rule or schedule block drops its old ticks.

## Development

Requires Node.js ≥ 20.

```bash
npm install
npm run login                       # once: authorize clasp with your Google account
cp .clasp.json.example .clasp.json  # then paste your scriptId (Apps Script → Project Settings)
npm run check                       # lint, tests, config, schema, agent sync, language — same as CI
npm run format                      # format all code with Prettier (optional, never a gate)
npm run push                        # upload src/ to your Apps Script project
```

| Path | Purpose |
|---|---|
| `src/` | Apps Script sources pushed by clasp (one shared global scope) |
| `tests/`, `scripts/` | Node test suite and repository tooling |
| `config.example.json`, `config.schema.json` | demo config, generated schema |
| `docs/` | roadmap, architecture, decisions, manual test plan |
| `.ai/`, `CLAUDE.md`, `AGENTS.md`, `.claude/`, `.codex/` | rules shared by every AI assistant |

Everything in this repository is written in English (`npm run check:language` enforces it).
See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, [docs/ROADMAP.md](docs/ROADMAP.md)
for the plan and [CHANGELOG.md](CHANGELOG.md) for releases.

## Working with AI assistants

Claude Code reads `CLAUDE.md`; Codex, Cursor, Copilot and other tools read `AGENTS.md`;
Gemini CLI reads `GEMINI.md`. All of them come from the same rule modules in `.ai/`
(`npm run sync-agents` regenerates the generated files), so every assistant follows the same
rules and starts from the same state documents in `docs/`.

## Secrets

None are needed. If you add integrations, store keys in *Project Settings → Script
properties*, never in code. See [SECURITY.md](SECURITY.md).
