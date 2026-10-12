# Task: English codebase, two-tier configuration, AI-agent infrastructure

Owner instruction of 2026-10-12: study the owner's `learning`, `codepack` and `CogniBoiler`
repositories and the personal data export; set up the same multi-assistant infrastructure here;
everything in the repository is English; a neutral demo config plus a git-ignored personal
config; personal calendar from 2026-10-13 to 2027-10-12; prepare for "avoid" habits (next task).
Owner decision: the sheet UI is English by default, a personal config may override every UI
string (the owner's Russian UI lives only in the ignored `my-config.json`).

Marks: `[ ]` open, `+` done, `-` not done or partially done (with a note).

## 1. Preparation

[ ] Study the reference repositories and the personal data
[ ] Owner decision on UI language recorded

## 2. Implementation

[ ] Split `src/Code.js` into modules under ~1000 lines, all code and comments in English
[ ] i18n layer: English strings by default, overrides from config
[ ] Config format v2: objects instead of tuples (legacy tuples still accepted), `startDate`,
    `endDate`, JSON Schema, neutral `config.example.json`
[ ] Personal `my-config.json` migrated (ignored by git): dates, Russian UI strings
[ ] Node tests: config normalization/validation, period, i18n completeness, defaults == example
[ ] Language guard: no Cyrillic in tracked files, part of `npm run check` and CI
[ ] `.ai/` rule modules, `CLAUDE.md`, generated `AGENTS.md`, `.claude/`, `.codex/`, sync script
[ ] State documents: `docs/ROADMAP.md`, `docs/architecture.md`, `docs/decisions.md`

## 3. Verification

[ ] `npm run check` green
[ ] Self-review of the diff

## 4. Completion

[ ] Merge into `main`, push
[ ] Final report
