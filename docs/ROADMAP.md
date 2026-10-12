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

## 3. Verify v2.2 in a real spreadsheet

Run `setup` in a fresh Google Sheet and in a sheet with v2.0 data; import the personal
config; check every menu item, the dashboard formulas, the charts, `onEdit` reactions,
backup and restore, a language switch. Fix what breaks. Nothing after this item should ship
before it is done.

## 4. Habits to keep and habits to avoid

Owner's next request: a separate list of rules to keep or avoid (no fast food, no sweets,
no soda, …) with its own sheet, categories and scoring. Scope with the
`daily-quest-feature-planner` agent; details come from the owner.

## 5. Content Tracker (second spreadsheet)

A LinkedIn and X posting calendar (every other day, Sunday off), an idea bank, metrics and
contacts. Likely a separate Apps Script project in its own directory.

## 6. Maybe: a web app over exported data

An export of the spreadsheet data feeding a separate application (Python or Go). Not
started; needs an owner decision on scope.
