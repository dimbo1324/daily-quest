# Architecture

How Daily Quest is built right now (v2.2.0). The code is the fact; update this file when the
shape changes.

## Runtime

A container-bound Google Apps Script project (V8) with `@OnlyCurrentDoc` and two OAuth
scopes: `spreadsheets.currentonly` and `script.container.ui` (`src/appsscript.json`). All
files in `src/` share one global scope; no file runs code at load time that depends on
another file.

| Module | Responsibility |
|---|---|
| `main.js` | `VERSION`, menu (`onOpen`), entry points, auto-extension of the calendar |
| `config.js` | `DEFAULT_CFG`, `cfg_()` cache, normalization (v1 tuples → v2 objects), validation, chunked storage, `calendarPeriod_`, JSON import / export |
| `i18n.js` | `STRINGS_EN`, `t_()`, `tq_()` (formula literal), `names_()` (sheet names) |
| `core.js` | layout constants, theme `TH`, date and formula utilities `U`, toasts, dialogs, `run_()` lock |
| `state.js` | `exportState_` snapshot, `_backup` write / read, tick restore |
| `build.js` | `buildAll_` and one builder per sheet; en_US formulas |
| `style.js` | styling, conditional formats, charts, soft protection |
| `game.js` | `onEdit`: XP toasts, level-ups, task completion dates, purchase checks |

## Sheets

| Sheet | Content |
|---|---|
| Dashboard | level, rank, XP, coins, today, streak, 7-day average, overdue and upcoming tasks, 30-day habit stats, two charts (hidden data in X:Z) |
| Habits | row 1 headers, row 2 XP per habit (linked to Settings), from row 3 one row per day: date, weekday, checkbox or «—» per habit, XP, completion %, streak |
| Tasks | done, title, category, deadline, priority, XP, notes, completed date, days left |
| Shop | reward, price, bought, date; balance block in F1:G3 |
| Settings | habits (name, XP, days) and game parameters F2:F4 (XP per level, coins per XP, streak threshold) |
| `_backup` | hidden, JSON snapshot of user data; fixed name |

## Configuration flow

`cfg_()` = `DEFAULT_CFG` overlaid with the personal config from document properties
(`dq_config_0..N`, `dq_config_chunks`). Menu «Import from JSON» merges a pasted config,
validates it, snapshots the current data with the current sheet names, saves and rebuilds.
Habits edited on the Settings sheet are read back on rebuild. Format details:
`.ai/project/14-config-reference.md`; schema: `config.schema.json` (generated).

## Rebuild and data safety

`setup` / «Rebuild»: `exportState_` → `writeBackup_` → `applyHabitsFromSheet_` →
`buildAll_(state)` (deletes all sheets except `_backup`, rebuilds, restores ticks by date and
habit name, restores tasks and shop rows, re-applies styling and protection). The calendar
period comes from `calendarPeriod_`; kept data that starts earlier extends it backwards.

## Tooling

`npm run check` = ESLint + `node:test` (`tests/harness.mjs` runs `src/` in a V8 context with
stubbed `PropertiesService` and `Utilities`) + config validation + schema sync + assistant
sync + language guard. CI runs it on every push and pull request.
