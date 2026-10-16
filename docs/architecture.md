# Architecture

How Daily Quest is built right now (v2.7.0). The code is the fact; update this file when the
shape changes.

## Runtime

A container-bound Google Apps Script project (V8) with `@OnlyCurrentDoc` and two OAuth
scopes: `spreadsheets.currentonly` and `script.container.ui` (`src/appsscript.json`). All
files in `src/` share one global scope; no file runs code at load time that depends on
another file.

| Module | Responsibility |
|---|---|
| `main.js` | `VERSION`, menu (`onOpen`), entry points, auto-extension of the calendar |
| `config.js` | `DEFAULT_CFG`, `DAYSETS`, `cfg_()` cache, normalization (v1 tuples, v2.6 schedule blocks), chunked storage, `calendarPeriod_` |
| `validation.js` | `validateCfg_` and its parts: precise error lines, unknown keys and fields rejected |
| `settings.js` | Settings sheet read-back (habits, rules, activities), JSON import / export dialogs, config reset |
| `i18n.js` | `STRINGS_EN`, `t_()`, `tq_()` (formula literal), `names_()` (sheet names) |
| `core.js` | layout constants, theme `TH`, date and formula utilities `U`, toasts, dialogs, `run_()` lock |
| `trackers.js` | shared layer for day-tracked sheets (habits, rules, routine): tracker list, `routineItems_`, column layout, building and appending days |
| `state.js` | `exportState_` snapshot, `_backup` write / read, tick restore |
| `build.js` | `buildAll_`, Settings, Tasks and Shop builders; en_US formulas |
| `dashboard.js`, `dashboard-style.js` | Dashboard cells and formulas; its styling and two charts |
| `schedule.js`, `schedule-style.js` | Schedule sheet: weekly template, helpers, «Today», summary, snapshot (`readSchedule_`, v2.6 migration), styling, «Sort schedule» |
| `stats.js`, `stats-style.js` | Stats sheet: data block (columns BC+), KPI tiles, heatmap; styling and up to eight charts on a 24 px grid |
| `charts.js` | `insertDarkChart_`, `percentBars_`: the shared dark chart style |
| `logs.js` | Logs sheet: `logEvent_` (append one row, never throws), `logEdit_` (onEdit capture), value sanitizing |
| `style.js` | styling of Settings, trackers, Tasks and Shop; conditional formats; soft protection |
| `game.js` | `onEdit`: XP toasts, level-ups, task completion dates, purchase checks |

## Sheets

| Sheet | Content |
|---|---|
| Dashboard | row 4 «Now / Next» from the Schedule summary; level, rank, XP, coins, today, streak, 7-day average, overdue and upcoming tasks, 30-day habit stats, rules section (clean streak and 30-day share per rule, below the habits), two charts (hidden data in X:Z) |
| Stats | KPI tiles (rows 5–7), 26-week habit completion heatmap (rows 10–19), eight charts from row 21 (incl. «Where your time goes» and routine adherence); hidden chart data from column BC; live formulas only |
| Habits | row 1 headers, row 2 XP per habit (linked to Settings), from row 3 one row per day: date, weekday, checkbox or «—» per habit, XP, completion %, streak |
| Rules | same layout as Habits without the streak column: one checkbox per rule per day (tick = kept), XP, kept share; XP per rule in row 2 linked to Settings column K; built only when `rules` is not empty |
| Schedule | A Days (day set or a one-off date), B Start, C End, D Activity (drop-down from Settings column O, free text allowed), E XP, F Duration, G Notes; I:L «Today» (filtered, sorted, ✅ / ⬜); N:O summary (hours per week, blocks, today's progress, Now, Next) and hint; hidden helpers T:Y (today?, now?, status, weekly hours, routine name, sort order) and the day-set lookup AA:AH; kept by rebuilds (display values) |
| Routine | tracker of the weekly blocks with XP, same layout as Habits (checkbox = done on time, «—» when not planned, XP with the perfect-day bonus, share, streak); row 2 XP written as values; only when some block has XP |
| Tasks | done, title, category, deadline, priority, XP, notes, completed date, days left |
| Shop | reward, price, bought, date; balance block in F1:G3 |
| Settings | habits A:C (name, XP, days), game parameters F2:F4 (XP per level, coins per XP, streak threshold), help in H, rules J:M (name, XP, type, days), activities O (the Schedule drop-down) |
| Logs | append-only audit log: time, event, sheet, cell, old value, new value, details; fixed name; kept by rebuilds; visible |
| `_backup` | hidden, JSON snapshot of user data; fixed name |

## Configuration flow

`cfg_()` = `DEFAULT_CFG` overlaid with the personal config from document properties
(`dq_config_0..N`, `dq_config_chunks`). Menu «Import from JSON» merges a pasted config,
validates it, snapshots the current data with the current sheet names, saves and rebuilds.
Habits and rules edited on the Settings sheet are read back on rebuild. Format details:
`.ai/project/14-config-reference.md`; schema: `config.schema.json` (generated).

Large sheets are written with `writeCells_` (one `setValues` over the bounding box) and batch
range calls; per-cell API calls over calendar-sized ranges exceed the 6-minute execution
limit.

## Rebuild and data safety

`setup` / «Rebuild»:

1. `captureState_` snapshots all user data and writes it to `_backup`. If the previous build
   was interrupted (flag `dq_build_incomplete`), the sheets are incomplete: the backup is used
   instead and is not overwritten.
2. `applySettingsSheet_` stores what was typed on the Settings sheet (habits, rules,
   activities, game parameters).
3. `buildAll_(state)` sets the flag, replaces `cfg.schedule` with the Schedule sheet's complete
   blocks, deletes the script's own sheets (tagged with developer metadata, or named like
   them, or empty; `_backup`, `Logs` and the owner's other sheets stay), rebuilds every
   sheet, restores ticks by date and item name (renamed routine blocks are matched by their
   base name and weekday), restores tasks, purchases and the schedule, re-applies styling and
   protection, and clears the flag.

Import saves the new config only after a successful build and puts the previous one back
on failure; keys present in the imported JSON win over values kept from the sheets (the
Schedule sheet stays the source of the schedule). «Restore from backup» swaps: the state
before it becomes the backup. Every operation and every user edit is appended to `Logs`
(`logEvent_`, `logEdit_`), found by name or by its remembered sheet id.

## Tooling

`npm run check` = ESLint + `node:test` (`tests/harness.mjs` runs `src/` in a V8 context with
stubbed `PropertiesService` and `Utilities`; `build-smoke.test.mjs` runs the dashboard, stats, schedule and
tracker builders against a fake Spreadsheet API; `schedule.test.mjs`, `fixes.test.mjs` and
`logs.test.mjs` cover the schedule, the audit regressions and the audit log) + config validation + schema sync + assistant
sync + language guard. CI runs it on every push and pull request. Formatting is separate:
`npm run format` (Prettier, `.prettierrc.json`) and is never a gate.
