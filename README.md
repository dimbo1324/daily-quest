# daily-quest

[![CI](https://github.com/dimbo1324/daily-quest/actions/workflows/ci.yml/badge.svg)](https://github.com/dimbo1324/daily-quest/actions/workflows/ci.yml)

Gamified habit & task tracker for Google Sheets (Apps Script): dark UI, XP, levels, streaks, coins/shop, dashboard, auto-backup and state-preserving upgrades.

## Install (manual, no tooling)
1. New Google Sheet → Extensions → Apps Script → paste `src/Code.js` → Save.
2. Run `setup`, grant access (the script only touches this spreadsheet: `@OnlyCurrentDoc`).
3. Reload the sheet → menu **🎮 Daily Quest**.

## Make it yours (no code edits)
- **Habits:** sheet `Настройки` → edit/add rows (name, XP, days) → menu *♻️ Пересобрать*.
- **Everything else** (tasks, rewards, categories, params): menu *⚙️ Настройки → 📥 Импорт из JSON*. See `config.example.json`.
- Your config is stored in the spreadsheet's document properties, not in the code.
  Keep your own copy as `my-config.json` (git-ignored). Export it via *⚙️ Настройки → 📤 Экспорт в JSON*.

## Upgrade
Paste the new `src/Code.js` (or `npm run push`) → menu *♻️ Пересобрать (данные сохранятся)*. Ticks, tasks and shop state are kept (backup in hidden sheet `_backup`).

## Development
Requires Node.js ≥ 20.

```bash
npm install
npm run login                       # once: authorize clasp with your Google account
cp .clasp.json.example .clasp.json  # then put your scriptId (Apps Script → Project Settings)
npm run check                       # lint + JSON validation (same as CI)
npm run push                        # upload src/ to your Apps Script project
```

Project layout:

| Path | Purpose |
|---|---|
| `src/` | Apps Script sources pushed by clasp (`Code.js`, `appsscript.json`) |
| `config.example.json` | Neutral sample config (committed) |
| `my-config.json`, `.clasp.json` | Personal, **git-ignored** |
| `scripts/` | Repo tooling (Node) |
| `.github/` | CI, Dependabot, templates |

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [CHANGELOG.md](CHANGELOG.md) for releases.

## Secrets
None are needed. If you add integrations, store keys in *Project Settings → Script properties*, never in code. See [SECURITY.md](SECURITY.md).
