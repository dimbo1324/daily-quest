# Task: rules to keep and to avoid (v2.3.0)

Owner instruction of 2026-10-12: add daily-tracked items to avoid (and healthy rules to keep),
configurable like habits; the owner's personal list goes into the git-ignored
`my-config.json`, the demo config uses different, neutral examples; then give the owner
instructions for deploying and manually testing in Google Sheets.

Design: a new `rules` config list (`{ name, xp, kind: keep|avoid, days }`) and a new `Rules`
sheet with the same day-by-day layout as `Habits`; a tick means "kept the rule that day".
Rule XP counts toward levels and coins; each rule shows its current clean streak and its
30-day share on the dashboard. Rules are optional (no rules → no sheet).

Marks: `[ ]` open, `+` done, `-` not done or partially done (with a note).

## 1. Implementation

+ Shared tracker layer for Habits and Rules (build, append, style, protect, restore)
+ Config: `rules` in defaults, normalization, validation, example, schema
+ Settings sheet: rules table (name, XP, type, days), read back on rebuild
+ Dashboard: rule XP in totals and charts, rules section with streak and 30-day share
+ Snapshot and restore of rule ticks and rule XP
+ UI strings (English) for everything new
+ Personal `my-config.json`: the owner's rules and Russian strings

## 2. Verification

+ Tests for rules config and validation
+ `npm run check` green
+ Manual test plan for a real spreadsheet (`docs/manual-test-plan.md`)

## 3. Completion

+ Docs, changelog, version 2.3.0, rule modules synced
+ Merge into `main`, push
