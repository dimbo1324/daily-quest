# Roadmap

The plan and its progress. Items run top to bottom; the first item without **Done** is next
unless the owner says otherwise. Mark an item done with the date and one line on what
shipped.

## 1. Repository foundation

**Done 2026-10-12.** Git setup (ignore rules for personal data, LF endings, editor config),
npm tooling with clasp and ESLint, GitHub Actions CI with a forbidden-files guard, Dependabot.

## 2. English codebase, config v2, assistant infrastructure (v2.2.0)

**Done 2026-10-12.** `src/` split into modules; all code and UI defaults in English with
`strings` overrides; config v2 (objects, `startDate` / `endDate`, generated schema, chunked
storage); tests; language guard; `.ai/` rules, `CLAUDE.md`, generated `AGENTS.md` and
`.codex/` mirror.

## 3. Rules to keep and to avoid (v2.3.0)

**Done 2026-10-12 (code).** `rules` config list and a Rules sheet tracked day by day; rule XP
in all totals; dashboard section with the clean streak and the 30-day share per rule. The
owner's personal rules live in `my-config.json`.

## 4. Stats sheet with charts and infographics (v2.4.0)

**Done 2026-10-12 (code).** Stats sheet with KPI tiles, a 26-week heatmap and the first charts (eight since v2.7);
batch cell writes for faster builds.

## 5. Logs sheet (v2.5.0)

**Done 2026-10-12 (code).** Audit log of every edit and operation in a `Logs` sheet that
survives rebuilds.

## 6. Daily schedule and code formatting (v2.6.0)

**Done 2026-10-15 (code).** Schedule sheet with an activity base and a drop-down, kept across
rebuilds; `npm run format` with Prettier; oversized modules split.

## 7. Schedule by weekday, routine in the game, time infographics, one-off days (v2.7.0)

**Done 2026-10-15 (code).** Days per block and one-off dates; «Today», «Now / Next»; XP per
block with a Routine tracker, streak and perfect-day bonus; «Where your time goes» and
routine adherence charts.

## 8. Audit fixes (v2.8.0)

**Done 2026-10-15 (code).** Four review agents audited the project; data-safety, number and
schedule defects fixed with regression tests; the owner's plan for 2026-10-16 added to the
personal config.

## 9. Verify v2.8 in a real spreadsheet — the hard next step

No new feature before this. Five releases (v2.4.1–v2.8.0) have only been verified by code and
tests.

Walk through `docs/manual-test-plan.md` in a fresh test spreadsheet, then in the real one
with the personal config. Fix what breaks. Nothing after this item should ship before it is
done.

Confirmed by the owner so far (2026-10-12): the personal config imports, the Rules sheet
appears, and the year-long calendar builds since v2.3.1. Not yet confirmed: the chart fix of
v2.4.1, the Stats, Logs, Schedule and Routine sheets.

## 10. Content Tracker (second spreadsheet)

A LinkedIn and X posting calendar (every other day, Sunday off), an idea bank, metrics and
contacts. Likely a separate Apps Script project in its own directory.

## 11. Maybe: a web app over exported data

An export of the spreadsheet data feeding a separate application (Python or Go). Not
started; needs an owner decision on scope.
