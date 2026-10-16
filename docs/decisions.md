# Decisions and Open Questions

Owner decisions that constrain future work. Newest first. An assistant that receives a
standing instruction in chat records it here in the same task.

## Decisions

### 2026-10-15 — The schedule is a weekly template that plays in the game

Blocks repeat on day sets (or a one-off date that is added to that day and hides the weekly
blocks it overlaps). A block with XP is tracked daily on the Routine sheet («done on time»)
and earns XP, a streak and a perfect-day bonus — never penalties. XP should not be given twice
for one action: a habit answers «did I do it», a schedule block «did I do it on time». Ticks
follow a block's name «HH:MM activity»; changing its start or activity starts a new column.

### 2026-10-15 — Daily schedule sheet

The daily routine lives on its own sheet as free time blocks (start, end, activity, notes).
Activities come from a base list (config `activities`, editable on the Settings sheet) or are
typed freely. Once the sheet exists it is the source of truth: rebuilds keep it, and the
config's `schedule` only seeds a spreadsheet that has no Schedule sheet yet.

### 2026-10-15 — Code style by command, not by gate

Prettier formats the code on demand (`npm run format`) in a vertical style (80 columns).
Formatting is not checked by `npm run check` or CI: code may be committed in any style.

### 2026-10-12 — Full audit log in a visible Logs sheet

Every action of the owner is logged with its date and time: each cell edit with old and new
value, and every operation (build, rebuild, reset, restore, import with the imported JSON,
export, …). The sheet is named `Logs` (fixed, not localized), stays visible for now and
survives rebuilds. Event names are stable English identifiers. The log is append-only and
unbounded; trimming or archiving is an open question.

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


- Logs: rotation or archiving once the sheet grows large; hiding the sheet later.

- How exactly the personal config should be set up and delivered to the sheet (the owner
  will specify in a following task).
- Rules: penalties for a slip, a bonus for long clean streaks, rule categories — not
  decided; the current model only rewards kept days.
