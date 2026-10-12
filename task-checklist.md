# Task: bring documentation, comments and project state up to date (v2.5.0)

Owner instruction of 2026-10-12: refresh the documentation, comments and the project as a
whole so everything is current; commit and push; everything ends up in `main`.

Marks: `[ ]` open, `+` done, `-` not done or partially done (with a note).

## 1. Audit and fixes

[ ] Find stale references (old function names, sheet lists, versions, test lists)
[ ] Code header comments match the modules (state, main, game)
[ ] Agents and skills: current function names; mirror regenerated
[ ] Rule modules: project map, commands, config reference
[ ] State documents: roadmap, architecture, decisions, manual test plan
[ ] README, SECURITY; package-lock version

## 2. Verification and publishing

[ ] `npm run check` green
[ ] Merge into `main`, push to origin
