---
# GENERATED from .claude/skills/ci-fix/SKILL.md by npm run sync-agents - do not edit.
name: ci-fix
description: Use when npm run check or the GitHub Actions CI fails — reproduce locally, find the failing section, fix the cause without weakening any check.
---

# Fixing a Failing Check

1. Reproduce with `npm run check` (CI runs exactly this on Node 22, plus a forbidden-files
   guard).
2. Run the failing section alone: `npm run lint`, `npm test`, `npm run check:config`,
   `npm run check:schema`, `npm run check:agents`, `npm run check:language`.
3. Typical causes:
   - `check:schema` or `check:agents`: a source changed without regenerating. Run
     `npm run schema` or `npm run sync-agents` and commit the artifact.
   - `check:language`: Cyrillic in a tracked file. Translate it, or move personal data to a
     git-ignored file.
   - `check:config`: the example or the local `my-config.json` fails validation; the message
     names the entry and the field.
   - `lint` with `no-undef` in `src/`: a typo, or a name that no `src/` file declares.
   - Forbidden-files guard: `my-config.json`, `.clasp.json`, `.env` or credentials got
     tracked. `git rm --cached <file>` and rotate anything secret.
4. Never delete, skip or loosen a test or a check to get green. If a rule itself is wrong,
   follow the `rules-evolution` skill.
