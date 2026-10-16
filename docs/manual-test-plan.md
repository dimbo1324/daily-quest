# Manual Test Plan (real Google Sheets)

The Node tests cover pure logic and a smoke run of the builders against a fake API. This plan
covers everything that needs a real spreadsheet. Run it after any change to `build.js`,
`style.js`, `state.js`, `trackers.js`, `stats.js`, `logs.js` or `game.js`, and record the result (date, version, what failed) in the final report.

Use a **fresh test spreadsheet** first; touch the real one only after the test copy passes.

## 0. Deploy

- [ ] `npm run check` is green.
- [ ] Code is in the Apps Script project: `npm run push`, or every `src/*.js` file pasted
      by hand plus `appsscript.json`.
- [ ] Function `setup` runs from the editor without errors; access granted.
- [ ] After a reload, the «🎮 Daily Quest» menu appears.

## 1. Demo build (English, demo config)

- [ ] Sheets in order: Dashboard, Stats, Habits, Rules, Routine, Schedule, Tasks, Shop, Settings, Logs;
      `_backup` hidden.
- [ ] The build finishes without an error dialog (a year-long calendar takes 1–3 minutes).
- [ ] Habits and Rules start today and run 60 days; inactive days show «—».
- [ ] Rules header: avoid rules have a purple title; row 2 shows «+N XP».
- [ ] Settings: habits table A:C, parameters E:F, help in H, rules table J:M with drop-downs
      for type and days.
- [ ] Dashboard shows no `#ERROR!`, `#REF!` or `#N/A`; both charts render.

## 2. Game reactions

- [ ] Tick a habit today → toast with XP; Dashboard «TOTAL XP» and «TODAY, XP» grow.
- [ ] Tick a rule today → toast «🛡️ <rule>» with XP; totals grow; the rule's streak shows 1.
- [ ] Untick both → totals return.
- [ ] Tick every active habit today → «Day closed at 100 %» toast.
- [ ] Task: tick without a title → refused; with a title → completion date and XP.
- [ ] Shop: buy a reward that costs more than the balance → purchase undone with a toast.
- [ ] Enough XP for a level → level-up toast; rank changes on the Dashboard.

## 3. Personal config

- [ ] Menu «⚙️ Settings → 📥 Import from JSON», paste `my-config.json` → success message.
- [ ] Sheets are renamed to the personal language; menu texts change after a reload.
- [ ] Calendar runs from the configured `startDate` to `endDate` (one row per day).
- [ ] The personal habits and rules appear; the Rules sheet uses its personal name.
- [ ] Ticks made before the import are still there where the habit or rule kept its name.

## 4. Data safety

- [ ] Change a habit XP and a rule XP on Settings → Dashboard recalculates.
- [ ] Add a rule row on Settings → menu «Rebuild» → the new rule column exists, old ticks kept.
- [ ] «Rebuild» keeps every tick, task and purchase.
- [ ] «Restore from backup» brings back the state before the last rebuild.
- [ ] «Add 30 days» extends Habits and Rules by the same 30 days.
- [ ] «Export to JSON» shows the effective config including `rules`.
- [ ] «Reset everything and rebuild» asks first, then starts clean; restore brings data back.

## 5. Stats sheet

- [ ] Stats sheet follows the Dashboard; no `#ERROR!`, `#REF!` or `#N/A` in the tiles.
- [ ] Tiles: best streak, perfect days, ticks and the 30-day average with a sparkline.
- [ ] Heatmap shows 26 weeks × 7 days; ticked days turn green, future days stay dark.
- [ ] Six charts (five without rules): total XP, weekly XP by source, XP by source,
      habits 30 days, rules 30 days, weekday averages. Tick something → charts update.

## 6. Logs sheet

- [ ] A `Logs` sheet exists at the end, with headers Time | Event | Sheet | Cell | Old value |
      New value | Details.
- [ ] Tick a habit → a row `edit` with the sheet, cell, `FALSE` → `TRUE` and «habit · date».
- [ ] Type a task title → a row with the old and new text.
- [ ] Rebuild → rows `backup` and `rebuild`; the Logs sheet and its rows are still there.
- [ ] Import the personal config → `config-import` with the pasted JSON in Details.
- [ ] Export → `config-export`; a purchase without enough coins → `purchase-refused`.
- [ ] Reload the spreadsheet → an `open` row.

## 7. Schedule, Today and Routine

- [ ] Sheets in order include Rules, Routine, Schedule (Routine only when a block has XP).
- [ ] Schedule columns: Days | Start | End | Activity | XP | Duration | Notes; a v2.6 sheet
      came through the upgrade with every block on «every day».
- [ ] Days offers every day, Mon–Fri, Mon–Sat, Sat–Sun and single weekdays; a typed date
      (17.10.2026) is accepted and shows in yellow.
- [ ] «Today» lists only today's blocks in time order; the current block is highlighted; a
      one-off block for today hides the weekly block it overlaps.
- [ ] Summary: hours per week, blocks, «✅ Today» progress, «Now» and «Next»; the Dashboard
      row 4 shows the same Now / Next.
- [ ] Give a block XP → «Rebuild» → a Routine column «HH:MM activity» exists; inactive days
      show «—»; ticking it gives a toast, XP and ✅ in «Today».
- [ ] Tick every routine block of today → the perfect-day toast and the bonus in the day's XP.
- [ ] Menu «Sort schedule by time» orders blocks by day set and start; «Today» and the summary
      stay in place; a `schedule-sort` row appears in Logs.
- [ ] Stats: «Where your time goes» shows hours per activity; «Routine: on time» bars exist.
- [ ] Edit a block, «Rebuild» → nothing lost, times did not shift.

## 8. Data safety after the v2.8 audit

- [ ] Rebuild twice in a row → both succeed; Logs shows `backup` and `rebuild` rows.
- [ ] «Restore from backup», then again → the second restore brings back the state before the
      first (undo).
- [ ] Add an extra sheet of your own, «Rebuild» → it is still there.
- [ ] Rename `Logs`, «Rebuild» → the renamed log keeps its rows and gets new ones.
- [ ] Tasks: select several empty rows in column A and press Space → the ticks are undone;
      tick several titled tasks at once → each gets a completion date.
- [ ] Settings: set a habit's XP to 0 and XP per level to 300, «Rebuild» → both stay.
- [ ] Schedule: a day with only Mon–Fri items on Saturday shows no 0 % and keeps the streak.

## 9. Look and feel

- [ ] Dark, calm styling on every sheet; no white cells in used areas.
- [ ] Today's row is highlighted; missed past days are dim red; Sundays are purple.
- [ ] Rules section on the Dashboard: streak in orange, 30-day share colored by level.
