# Manual Test Plan (real Google Sheets)

The Node tests cover pure logic only. This plan covers everything that needs a real
spreadsheet. Run it after any change to `build.js`, `style.js`, `state.js`, `trackers.js` or
`game.js`, and record the result (date, version, what failed) in the final report.

Use a **fresh test spreadsheet** first; touch the real one only after the test copy passes.

## 0. Deploy

- [ ] `npm run check` is green.
- [ ] Code is in the Apps Script project: `npm run push`, or every `src/*.js` file pasted
      by hand plus `appsscript.json`.
- [ ] Function `setup` runs from the editor without errors; access granted.
- [ ] After a reload, the «🎮 Daily Quest» menu appears.

## 1. Demo build (English, demo config)

- [ ] Sheets in order: Dashboard, Habits, Rules, Tasks, Shop, Settings; `_backup` hidden.
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

## 5. Look and feel

- [ ] Dark, calm styling on every sheet; no white cells in used areas.
- [ ] Today's row is highlighted; missed past days are dim red; Sundays are purple.
- [ ] Rules section on the Dashboard: streak in orange, 30-day share colored by level.
