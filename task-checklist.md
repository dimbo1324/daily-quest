# Task: schedule by weekday, today's plan, routine in the game, time infographics, one-off days (v2.7.0)

Owner instruction of 2026-10-15: implement all four agreed steps at once.

1. Days per block (every day, Mon–Fri, Mon–Sat, Sat–Sun, single weekdays) and a «Today» block
   on the Schedule sheet; existing blocks become «every day».
2. Optional XP per block; blocks with XP become columns of a «Routine» tracker sheet (tick =
   done on time, «—» on days the block is not planned); XP feeds levels and coins; «Today»
   shows ✅ / ⬜ and «done X of Y · +XP»; a streak of days on schedule and a perfect-day bonus.
   No penalties.
3. Infographics: «Where your time goes» (planned hours per week by activity), routine
   adherence over 30 days on the Stats sheet, a «Now / Next» line on the Dashboard.
4. One-off days: a date in the Days cell makes a block for that date only; it is added to that
   day and hides template blocks it overlaps.

Data safety: the v2.6 Schedule sheet (Start | End | Activity | Duration | Notes) is read and
migrated on the next rebuild; nothing the owner typed is lost.

Marks: `[ ]` open, `+` done, `-` not done or partially done (with a note).

## 1. Implementation

[ ] Config: extended day sets, block `days` / `xp`, `schedulePerfectBonus`, legacy blocks
[ ] Schedule sheet v2: Days | Start | End | Activity | XP | Duration | Notes, helpers, Today,
    summary, Now / Next; migration of the v2.6 layout
[ ] Routine tracker (items from XP blocks), bonus, streak, toasts
[ ] Dashboard and Stats include routine XP; Now / Next line; time and adherence charts
[ ] UI strings; personal config (days, XP, Russian strings)

## 2. Verification

[ ] Tests: config, migration of both layouts, routine items, builders smoke
[ ] `npm run check` green, `npm run format`

## 3. Completion

[ ] Docs, manual test plan, changelog, version 2.7.0, rule modules synced
[ ] Merge into `main`
