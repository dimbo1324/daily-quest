# Decisions and Open Questions

Owner decisions that constrain future work. Newest first. An assistant that receives a
standing instruction in chat records it here in the same task.

## Decisions

### 2026-10-12 — Rules to keep and to avoid

A separate `rules` list and sheet, next to habits. A tick means "kept the rule that day" for
both kinds (`keep`, `avoid`), so a missed past day is a slip. Kept rules earn XP like habits;
no penalties for now. Each rule shows its clean streak (days since the last missed day) and
its 30-day share on the dashboard.

### 2026-10-12 — Everything in the repository is English

Code, comments, UI defaults, documentation, rule modules, commit messages. Enforced by
`npm run check:language`. Other languages live only in git-ignored personal files.

### 2026-10-12 — The sheet UI is English by default and localized through the config

Every UI string is a key in `STRINGS_EN`; a config's `strings` object overrides any of them.
The owner's Russian UI lives in the git-ignored `my-config.json`.

### 2026-10-12 — Two configuration tiers

A neutral demo config in the repository (`DEFAULT_CFG` = `config.example.json`) and a
personal, git-ignored `my-config.json` applied through the sheet menu. How the personal
config is set up in detail is still to be specified by the owner (see open questions).

### 2026-10-12 — Owner's personal calendar

The owner's calendar starts on 2026-10-13 and runs one year, to 2027-10-12
(`startDate` / `endDate` in `my-config.json`).

### 2026-10-12 — Simple git, no pull requests

Short task branches merged into `main` locally and pushed; no PR process, no branch
protection. `npm run check` green before a merge.

### 2026-10-12 — `@OnlyCurrentDoc`

The script touches only its own spreadsheet. A new OAuth scope or external call needs a new
decision here.

## Open questions

- How exactly the personal config should be set up and delivered to the sheet (the owner
  will specify in a following task).
- Rules: penalties for a slip, a bonus for long clean streaks, rule categories — not
  decided; the current model only rewards kept days.
