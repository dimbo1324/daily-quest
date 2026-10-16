# Task: audit by an agent network, fixes, tests, the owner's routine for 2026-10-16 (v2.8.0)

Owner instruction of 2026-10-15: push; let a network of agents audit the project for
collisions, inconsistencies and awkward spots; fix what they found; test; add the owner's real
plan for 2026-10-16 as an example; test again; commit and push when everything is green.

Audit: four parallel reviewers (schedule and routine; config, i18n and state; dashboard,
stats, logs and game; tooling, docs and rules). Findings and their outcome are listed in the
final report; deferred items are marked `-` below.

Marks: `[ ]` open, `+` done, `-` not done or partially done (with a note).

## 1. Data safety

[ ] Interrupted builds never overwrite the backup; the next rebuild restores from it
[ ] Failed import restores the previous stored config
[ ] «Restore from backup» swaps: the current state goes into the backup (undo by restoring again)
[ ] Rebuild deletes only the script's own sheets (owner's extra sheets survive)
[ ] Logs sheet survives a rename (tracked by id)

## 2. Correctness

[ ] Schedule: raw times, unknown day text kept, rows with only days/XP kept, backup before
    sort, overlap compare with a tolerance, «Now» for blocks after midnight, helpers hidden
    and protected, routine names that survive twins and language changes
[ ] Trackers: days with nothing planned are neutral (no 0 %, streak carried over)
[ ] Tasks: untitled rows never earn XP; bulk ticks get dates; task XP in today, week and the
    30-day chart; XP 0 stays 0; same-day completions in the cumulative series
[ ] Shop: bulk purchase ticks are undone; level-up toast includes the perfect-day bonus
[ ] Config: XP 0 allowed for habits and rules; Settings parameters read back and exported;
    export is read-only; imported keys win over the sheet snapshot; schedule-import notice;
    sheet names unique ignoring case; names with + - = @ kept as text; formats quoted
[ ] Log timestamps with seconds and zone

## 3. Tooling and docs

[ ] CI secrets guard matches .gitignore; permission file: home clasp token denied, no blanket
    npm install
[ ] Docs: install and by-hand upgrade steps, stale paths, chart and test counts, rule
    precedence, roadmap

## 4. Owner's routine for 2026-10-16 and verification

[ ] One-off blocks for 2026-10-16 in `my-config.json`
[ ] Tests for the fixes, `npm run check` green
[ ] Merge into `main`, push
