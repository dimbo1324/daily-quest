# Contributing

## Workflow

- `main` is always a working version that can be pushed to a spreadsheet.
- No pull requests: work on a short branch (`feat/…`, `fix/…`, `chore/…`, `docs/…`), merge it
  into `main` locally, push. A trivial one-commit fix may go straight to `main`.
- `npm run check` must be green before a merge (CI runs the same command).

## Commits — [Conventional Commits](https://www.conventionalcommits.org/)

`feat:` new mechanic · `fix:` bug fix · `refactor:` · `docs:` · `test:` · `chore:` · `ci:` · `build:`

## Loop

1. `git switch -c feat/my-feature`
2. Edit `src/`. All files share one global scope; UI text goes into `STRINGS_EN`
   (`src/i18n.js`), settings into `DEFAULT_CFG` (`src/config.js`).
3. `npm run check`
4. `npm run push`, try it in your spreadsheet.
5. Commit, merge into `main`, push.

## Releases

1. Bump `VERSION` in `src/main.js` and `version` in `package.json` (SemVer).
2. Add an entry to `CHANGELOG.md`.
3. `git tag vX.Y.Z && git push --tags`.

## Rules

- English only in everything tracked by git.
- Never commit `my-config.json`, `.clasp.json`, `.clasprc.json`, `.env` or any key or token.
  They are git-ignored, and CI fails if one gets tracked.
- Generated files (`AGENTS.md`, `.codex/agents`, `.codex/skills`, `config.schema.json`) are
  regenerated, never edited: `npm run sync-agents`, `npm run schema`.

## Future parts in Python or Go

A separate top-level directory (`apps/<name>/` or `server/`) with its own tooling;
`.gitignore` and `.editorconfig` already cover Python and Go.
