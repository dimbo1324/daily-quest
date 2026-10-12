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

**Done 2026-10-12 (code).** Stats sheet with KPI tiles, a 26-week heatmap and six charts;
batch cell writes for faster builds.

## 5. Logs sheet (v2.5.0)

**Done 2026-10-12 (code).** Audit log of every edit and operation in a `Logs` sheet that
survives rebuilds.

## 6. Verify v2.5 in a real spreadsheet

Walk through `docs/manual-test-plan.md` in a fresh test spreadsheet, then in the real one
with the personal config. The year-long build fix of v2.3.1 is confirmed by the owner. Fix what breaks. Nothing after this item should ship before it is
done.

## 7. Content Tracker (second spreadsheet)

A LinkedIn and X posting calendar (every other day, Sunday off), an idea bank, metrics and
contacts. Likely a separate Apps Script project in its own directory.

## 8. Maybe: a web app over exported data

An export of the spreadsheet data feeding a separate application (Python or Go). Not
started; needs an owner decision on scope.
