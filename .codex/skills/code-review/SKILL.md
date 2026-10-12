---
# GENERATED from .claude/skills/code-review/SKILL.md by npm run sync-agents - do not edit.
name: code-review
description: Use to review the current diff before finalizing a Daily Quest task — scope, user-data safety, config compatibility, language policy, Apps Script rules, tests and documentation drift.
---

# Reviewing Changes

Run this **before** merging and before the final report.

```bash
git status --short --branch
git diff main...HEAD
```

For an independent pass, delegate to the `daily-quest-quality-reviewer` agent.

## Mandatory checklist

1. **Scope.** No changes the task did not require.
2. **User data.** Rebuild, import and upgrade keep ticks, tasks and purchases.
3. **Config.** Old configs load; defaults, validator, example, schema and tests agree.
4. **Language.** English only in tracked files; UI text through `t_()`, formula text
   through `tq_()`.
5. **Apps Script.** Unique globals, no cross-file top-level code, en_US formulas, batch
   range operations, locks on mutating actions.
6. **Security.** No personal data, secrets, new scopes or external calls.
7. **Tests.** Not deleted or weakened; regressions covered.
8. **Documents.** Architecture, roadmap, decisions, README, rule changelog as needed.
9. **Leftovers.** Debug output, temp files, commented-out code.

Fix serious findings in the same task; record unrelated problems separately. If there are
no findings, say so plainly.
