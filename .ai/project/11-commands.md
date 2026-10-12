# Project Commands and Quality Gates

All commands run from the repository root (PowerShell or Git Bash on Windows, any POSIX
shell elsewhere). Node.js 20+; dependencies are dev-only (`npm install` once per clone).

## The one gate

```bash
npm run check        # lint + tests + config + schema + agents sync + language — CI runs this
```

| Script | Purpose |
|---|---|
| `lint` / `lint:fix` | ESLint for Apps Script (shared global scope) and Node tooling |
| `test` | `node:test` suite in `tests/` |
| `check:config` | validates `config.example.json` and a local `my-config.json` with the script's own validator |
| `check:schema` / `schema` | verify / regenerate `config.schema.json` from `src/` |
| `check:agents` / `sync-agents` | verify / regenerate `AGENTS.md` and the `.codex/` mirror |
| `check:language` | no Cyrillic in tracked files |
| `push` / `pull` / `open` | clasp: upload `src/` to the owner's Apps Script project, download, open |
| `deploy` | `check`, then `push` |

**Standing duty — keep the tooling true.** A task that changes how the project is checked,
built or published updates the matching script and this table in the same task. A source
whose artifact is generated (`config.schema.json`, `AGENTS.md`, `.codex/`) is committed
together with the regenerated artifact.

## Publishing (owner decision 2026-10-12)

- Pet project, fast loop, **no pull requests**. Work on a short task branch
  (`type/short-description`), commit in logical units, merge into `main` locally, push
  `main`. A trivial one-commit fix may go straight to `main`.
- `npm run check` is green before a merge to `main`.
- Agents push only when the owner asked for it in the current task. Never force-push `main`.

## clasp setup (once per machine)

`npm run login`, copy `.clasp.json.example` to `.clasp.json` (git-ignored) and paste the
`scriptId` from Apps Script → Project Settings; enable the Apps Script API at
script.google.com/home/usersettings. `npm run push` then uploads every file in `src/`.
Without clasp, the owner can paste each `src/*.js` file into the Apps Script editor by hand.

## Real-sheet verification

Tests cover pure logic only; sheet building runs against Google. After a change to
`build.js`, `style.js`, `state.js`, `trackers.js` or `game.js`, keep
`docs/manual-test-plan.md` current and say in the final report which of its sections were
run in a real spreadsheet, or that none were.
