# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org/).

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
