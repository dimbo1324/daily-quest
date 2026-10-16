# Task: daily schedule sheet and code auto-formatting (v2.6.0)

Owner instruction of 2026-10-15:
1. A separate sheet for the daily routine: time blocks (start, end) with an activity, typed by
   hand or picked from a drop-down; a base of key daily activities (work, cooking, laundry,
   sport, meditation, shower, …). Data already entered must survive.
2. One terminal command that formats all code into one standard, vertically oriented style.
   Commits and pushes stay allowed in any formatting (no format gate).

Design:
- `activities` (string list, the drop-down base, also editable on the Settings sheet, column O)
  and `schedule` (`{ start, end, activity, notes }`, initial content only) config keys.
- `Schedule` sheet after the trackers: Start | End | Activity | Duration | Notes, summary,
  overlap and "now" highlighting, menu «Sort schedule by time».
- Rebuilds snapshot the schedule from the sheet (display values, so times never shift) and
  write it back; a spreadsheet without the sheet gets the config's schedule once.
- Prettier (`npm run format`, `npm run format:check`), defaults matching the owner's
  reformat of 2026-10-13 (80 columns, double quotes); not part of `npm run check`.
- Split files over the 600-line rule after the reformat (style, build, stats).

Marks: `[ ]` open, `+` done, `-` not done or partially done (with a note).

## 1. Formatting

+ Prettier config, ignore file, npm scripts; fix the string-key test for double quotes
+ Split `build.js`, `style.js`, `stats.js` below ~600 lines

## 2. Schedule

+ Config: `activities`, `schedule` (defaults, validation, example, schema, tests)
+ `src/schedule.js`: build, style, snapshot, restore, sort menu action (logged)
+ Settings sheet: activities column, read back on rebuild
+ English UI strings; personal activities, schedule and Russian strings in `my-config.json`

## 3. Verification and completion

+ Tests (config, time parsing, builder smoke), `npm run check` green
+ Docs, manual test plan, changelog, version 2.6.0, rule modules synced
+ Merge into `main`
