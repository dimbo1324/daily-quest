# Task: Logs sheet — a full audit log of the owner's actions (v2.5.0)

Owner instruction of 2026-10-12: a visible sheet named `Logs` that records every action
with its date and time — every edit of any cell (ticks included) and every operation:
build, rebuild, reset, restore, import (with what was imported), export, and so on — so
that anything can be reconstructed if needed.

Design: `src/logs.js`; columns Time (with seconds and zone) | Event | Sheet | Cell | Old value
| New value | Details. User edits come from `onEdit` (single cells with old and new value,
multi-cell edits with their new values); tracker ticks carry the item name and date. Menu
operations, imports (full JSON), exports, backups, errors and game outcomes are logged by
the code. The sheet name is fixed (`Logs`) and the sheet survives every rebuild, like
`_backup`. Logging never throws.

Marks: `[ ]` open, `+` done, `-` not done or partially done (with a note).

## 1. Implementation

[ ] `src/logs.js`: sheet creation, styling, `logEvent_`, `logEdit_`, value sanitizing
[ ] Rebuilds keep the Logs sheet
[ ] Hooks: onEdit, menu actions, import / export / reset config, backups, errors, game events
[ ] English UI strings; Russian headers in the personal config

## 2. Verification

[ ] Tests for logging (sanitizing, edit capture, rebuild exemption), `npm run check` green
[ ] Manual test plan updated

## 3. Completion

[ ] Docs, changelog, version 2.5.0, rule modules synced
[ ] Merge into `main`
