# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org/).

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
