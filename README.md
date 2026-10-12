# daily-quest

[![CI](https://github.com/dimbo1324/daily-quest/actions/workflows/ci.yml/badge.svg)](https://github.com/dimbo1324/daily-quest/actions/workflows/ci.yml)

Gamified habit & task tracker for Google Sheets (Apps Script): dark UI, XP, levels, streaks,
coins and a reward shop, dashboard with charts, auto-backup and state-preserving upgrades.
English UI out of the box, fully localizable through the config.

## Install

**With clasp (recommended):** see [Development](#development), then `npm run push`.

**By hand:** new Google Sheet → Extensions → Apps Script → create one script file per file in
`src/` (same names, paste the contents) and replace `appsscript.json` (Project Settings →
show the manifest) → Save.

Then run `setup` and grant access (the script only touches this spreadsheet:
`@OnlyCurrentDoc`). Reload the sheet → menu **🎮 Daily Quest**.

## Configure it (no code edits)

Two configs:

| File | In git | Purpose |
|---|---|---|
| `config.example.json` | yes | neutral demo config, identical to the built-in defaults |
| `my-config.json` | **no** (ignored) | your personal config: habits, tasks, rewards, dates, UI language |

1. Copy `config.example.json` to `my-config.json` and edit it. Editors with JSON Schema
   support (VS Code) autocomplete and validate it through `config.schema.json`.
2. `npm run check:config` validates it with the script's own validator.
3. In the sheet: menu **⚙️ Settings → 📥 Import from JSON**, paste the file. The tracker is
   rebuilt and your data is kept.

Highlights:

- `startDate` / `endDate` pin the calendar (for example one year); otherwise it starts on the
  first build and runs `daysToCreate` days, extending itself by 30 days as it nears the end.
- `strings` overrides any UI text, sheet names included — this is how you translate the
  sheet. The keys and English defaults are listed in `config.schema.json`.
- Habits can also be edited on the `Settings` sheet → menu **♻️ Rebuild**.
- **⚙️ Settings → 📤 Export to JSON** writes the effective config back for `my-config.json`.

## Upgrade

Push or paste the new `src/` → menu **♻️ Rebuild (data is kept)**. Ticks, tasks and shop state
are kept (backup in the hidden sheet `_backup`; **🛟 Restore from backup** brings it back).
Ticks are matched by date and habit name, so renaming a habit drops its old ticks.

## Development

Requires Node.js ≥ 20.

```bash
npm install
npm run login                       # once: authorize clasp with your Google account
cp .clasp.json.example .clasp.json  # then paste your scriptId (Apps Script → Project Settings)
npm run check                       # lint, tests, config, schema, agent sync, language — same as CI
npm run push                        # upload src/ to your Apps Script project
```

| Path | Purpose |
|---|---|
| `src/` | Apps Script sources pushed by clasp (one shared global scope) |
| `tests/`, `scripts/` | Node test suite and repository tooling |
| `config.example.json`, `config.schema.json` | demo config, generated schema |
| `docs/` | roadmap, architecture, decisions |
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
