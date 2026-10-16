# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org/).

## [2.8.0] - 2026-10-15
Fixes from an audit by four parallel review agents.
### Fixed — data safety
- An interrupted rebuild (error or time limit) no longer lets the next rebuild overwrite the
  backup with the half-built sheets: the next rebuild recovers from the backup.
- A failed import puts the previous stored config back.
- «Restore from backup» keeps the state before it as the backup (restore again to undo).
- Rebuilds delete only the script's own sheets; the owner's other sheets survive.
- The Logs sheet survives a rename (remembered by id).
- Schedule: times are read from cell values (7:30 PM, 07:30:00 no longer vanish); unknown
  day text is kept as typed instead of becoming «every day»; rows with only days or XP are
  kept; sorting writes a backup first; routine ticks follow a block whose name changed
  because a twin block was added or removed or the language changed; identical blocks get
  distinct names.
- Names starting with + - = @ (habits, rules, tasks, rewards) stay text.
### Fixed — numbers
- Days with nothing planned no longer count as 0 % or reset streaks.
- Untitled task rows never earn XP; bulk-ticked tasks get completion dates; task XP appears
  in today's XP, the week's XP and the 30-day chart; tasks done today count in the
  cumulative series; a task XP of 0 stays 0.
- Bulk «Bought» ticks are undone (purchases go one at a time so the balance is checked).
- The level-up toast includes the perfect-day bonus.
- One-off blocks no longer hide an adjacent weekly block (time tolerance); «Now» covers the
  after-midnight part of a block that started yesterday.
- Habit and rule XP 0 is valid (the Settings sheet allows it); game parameters typed on the
  Settings sheet are read one by one and exported; Export no longer changes the stored config;
  imported keys win over values kept from the sheets; an import tells when the Schedule sheet
  kept the schedule; sheet names must differ ignoring case.
### Changed
- Schedule helper columns are hidden and «Today» / summary are soft-protected.
- Log timestamps keep seconds and the zone.
- Up to 300 schedule blocks.
- CI secrets guard matches the .gitignore secrets block; the assistant permission file denies
  the home clasp token and no longer allows a blanket `npm install`.
- Docs: install and by-hand upgrade steps, rule precedence, test list, chart counts.

## [2.7.0] - 2026-10-15
### Added
- Schedule by weekday: a Days column per block (every day, Mon–Fri, Mon–Sat, Sat–Sun or a
  single weekday). Existing blocks become «every day».
- One-off blocks: a date in the Days cell; the block is added to that day and hides the
  weekly blocks it overlaps.
- «Today» on the Schedule sheet: today's blocks in time order with ✅ / ⬜, the current block
  highlighted; summary with planned hours per week, today's progress, «Now» and «Next».
- XP per block and a Routine tracker sheet: blocks with XP are ticked day by day like habits;
  their XP feeds levels and coins, with a streak of days on schedule and a perfect-day bonus
  (`schedulePerfectBonus`, default 20). No penalties.
- Dashboard «Now / Next» line; Stats charts «Where your time goes» (planned hours per week by
  activity) and «Routine: on time, last 30 days»; routine XP in every total, the weekly chart
  and the XP-by-source donut.
- More day sets for habits and rules too (Sat–Sun and single weekdays).
- Hourly recalculation so «Today», «Now» and «Next» follow the clock.
### Changed
- The v2.6 Schedule layout is read and migrated on the next rebuild; nothing is lost.
- Config validation moved to `validation.js`.

## [2.6.0] - 2026-10-15
### Added
- Schedule sheet: the daily routine as time blocks — start, end, activity, duration, notes —
  with a planned-time summary, red overlapping blocks, the current block highlighted and the
  menu action «Sort schedule by time». The sheet is kept across rebuilds and backups.
- `activities` (the drop-down base, also editable on the Settings sheet, column O) and
  `schedule` (initial routine for a spreadsheet without the sheet) config keys.
- Prettier: `npm run format` formats every .js, .mjs and .json file; `npm run format:check`
  reports only. Neither blocks a commit.
### Changed
- Modules over 600 lines after the vertical reformat were split: `dashboard.js`,
  `dashboard-style.js`, `stats-style.js`, `charts.js`, `settings.js`.
### Fixed
- The UI-string test found no keys after the switch to double quotes.

## [2.5.0] - 2026-10-12
### Added
- Logs sheet: an append-only audit log with time (seconds and zone), event, sheet, cell,
  old value, new value and details. Every cell edit is logged (tracker ticks name the item and
  the date; pasted ranges keep their new values), and so are build, rebuild, reset, restore,
  config import (with the full imported JSON) and failed imports, export (with the JSON),
  config reset, restyle, added days, backups, purchases and refusals, level-ups, errors and
  each opening of the spreadsheet. The sheet survives rebuilds.

## [2.4.1] - 2026-10-12
### Fixed
- Rebuild failed with "chart option no longer supported: chartArea.bottom": charts now set
  only `left` and `top` of the chart area. A rejected Stats chart is reported in a toast
  instead of aborting the rebuild.

## [2.4.0] - 2026-10-12
### Added
- Stats sheet: KPI tiles (best streak, perfect days, ticks, 30-day average with a sparkline),
  a 26-week habit completion heatmap with a legend, and six charts — total XP over time,
  XP per week by source, XP by source, habit completion and rules kept over 30 days,
  completion by weekday.
- Builder smoke test against a fake Apps Script API.
### Changed
- Dashboard and Stats cells are written in one batch call instead of one call per cell.
### Fixed
- The dashboard failed to build when the `rules` list was empty.

## [2.3.1] - 2026-10-12
### Fixed
- Building a year-long calendar stopped half way (Apps Script time limit): inactive days
  were set cell by cell through range lists. Checkboxes and «—» are now written in two
  batch calls per tracker sheet.

## [2.3.0] - 2026-10-12
### Added
- Rules: a new `rules` config list (`{ name, xp, kind: keep | avoid, days }`) and a Rules
  sheet tracked day by day like habits. A tick means the rule was kept that day.
- Rule XP counts toward levels, coins, today's XP, weekly XP and the 30-day chart.
- Dashboard rules section: current clean streak and 30-day share per rule.
- Settings sheet rules table (name, XP, type, days), read back on rebuild.
- `docs/manual-test-plan.md` for checks in a real spreadsheet.
### Changed
- Habits and rules share one tracker layer (`src/trackers.js`).

## [2.2.0] - 2026-10-12
### Added
- Config format v2: habits, tasks and rewards as objects (v1 tuples still load),
  `startDate` / `endDate` for a fixed calendar, `strings` for UI localization.
- `config.schema.json` (generated) for editor completion and validation.
- Personal config stored in chunks, so large configs fit document-property limits.
- `node:test` suite, config and language checks, assistant rule system
  (`.ai/`, `CLAUDE.md`, `AGENTS.md`, `.claude/`, `.codex/`).
- Repository tooling: clasp, ESLint, CI, Dependabot, issue templates.
### Changed
- The script is split into modules under `src/`; code, comments and the default UI are English.
- Neutral, generic demo config.

## [2.1.0]
### Added
- Initial public version of Daily Quest v2 (`Code.js`).
