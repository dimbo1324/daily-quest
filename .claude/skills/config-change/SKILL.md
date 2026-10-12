---
name: config-change
description: Use when adding or changing a config key, a habit/task/reward field, or UI strings — the one-pass procedure that keeps defaults, validation, schema, example, tests and docs consistent.
---

# Changing the Configuration

Reference: `.ai/project/14-config-reference.md`. Every step in the same task:

1. `src/config.js` — default in `DEFAULT_CFG`; legacy input handled in `normalizeCfg_`;
   precise errors in `validateCfg_` (unknown fields stay errors).
2. `src/i18n.js` — English text for any new UI string in `STRINGS_EN`.
3. Code that uses the setting reads it through `cfg_()`.
4. `config.example.json` — mirror the new defaults (neutral, generic content only).
5. `npm run schema` — regenerate `config.schema.json`.
6. `tests/config.test.mjs` — defaults, validation errors, legacy input.
7. `docs/architecture.md` and `.ai/project/14-config-reference.md` (plus `.ai/CHANGELOG.md`
   and `npm run sync-agents`).
8. `npm run check`.

The owner's `my-config.json` is git-ignored: update it only when asked, then run
`npm run check:config`, and tell the owner to re-import it (menu «Import from JSON»).
