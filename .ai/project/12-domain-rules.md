# Domain Rules and House Style (Daily Quest)

These sharpen the universal rules for this codebase. Stricter wins.

## Apps Script code

- V8 runtime, plain script files: no modules, no `import`. Every top-level name in `src/` is
  global across files and must be unique (a test enforces it). Private helpers end in `_`
  (Apps Script hides them from the run menu); entry points called by menus, triggers or
  `google.script.run` have no underscore.
- No top-level code may depend on another file's declarations: file load order is not
  guaranteed. Read config only through `cfg_()` (lazy, cached), sheet names only through
  `names_()`, UI text only through `t_()` / `tq_()`.
- A file past roughly 600 lines is split by meaning (counted after `npm run format`). This
  limit replaces the universal one, including for `main.js` (menu and entry points).
- Code style is Prettier (`.prettierrc.json`, 80 columns, double quotes). Run
  `npm run format` on files you touch; formatting is never a gate and never mixed into an
  unrelated commit.
- Mutating menu actions run inside `run_()` (document lock, readable errors). Destructive ones
  ask through `confirm_()` first and write a backup before touching data.
- Triggers are simple triggers (`onOpen`, `onEdit`); they must never throw and must stay fast.
- Every new user-facing operation calls `logEvent_(event, info)` with a stable kebab-case
  English event name; logging never throws and never replaces error handling.

## Formulas and the sheet

- Formulas are written in en_US syntax; `buildAll_` forces the spreadsheet locale to
  `en_US` because comma-decimal locales break them. Repeated row formulas use R1C1 via
  `setFormulasR1C1`.
- Text inside a formula goes through `tq_()` (quotes doubled). Never splice raw user text
  into a formula.
- Batch reads and writes (`getValues` / `setValues` over ranges, `writeCells_` for sparse
  layouts); no per-cell calls or range lists over calendar-sized ranges — a year-long build
  must stay well inside the 6-minute execution limit (v2.3.1 hit it).
- Only `SUMIF` / `COUNTIF` expand inside `ARRAYFORMULA`; `SUMIFS` / `COUNTIFS` do not.
- Chart options: `chartArea` takes `left`, `top` and `backgroundColor` only — Google rejects
  `right` and `bottom` and the whole build fails.
- User data is matched by date and item name (habits, rules, routine blocks «HH:MM
  activity»). Renaming loses old ticks — say so whenever a task touches item identity.

## Configuration

- Two tiers: `DEFAULT_CFG` (= `config.example.json`, neutral) and the personal config stored
  in document properties (applied via menu «Import from JSON» from `my-config.json`).
- A new setting is added in ONE pass: `DEFAULT_CFG`, `normalizeCfg_` (legacy input),
  `validateCfg_`, `config.example.json`, `npm run schema`, a test, `docs/architecture.md`,
  and the config reference module. Old configs must keep loading.
- Validation messages are precise: which entry, which field, what is allowed.

## Internationalization

- Every user-visible string is a key in `STRINGS_EN`; code never inlines UI text.
- A new key is English in `STRINGS_EN` and appears in the regenerated schema; the owner's
  translation is added to `my-config.json` only when the owner asks (it is not tracked).
- Sheet names come from `strings`; `_backup` is fixed so backups survive a language change.
- UI string keys and config keys are never removed or renamed: stored personal configs
  override them and validation rejects unknown keys, so a removed key would break the next
  rebuild. Repurpose the text instead.
- A sheet that holds user data (trackers, Tasks, Shop, Schedule) is snapshotted by
  `exportState_` and written back by its builder; times and dates are read as display
  values or ISO text, never through time-only `Date` objects (1899 time-zone offsets).

## Tests

- Pure logic (config, validation, period, i18n, storage) is covered in `tests/`. A bug fix
  in pure logic comes with a regression test.
- Never delete, skip or weaken a test to make the gate green.

## Assistant workspaces

- `.claude/agents|skills` are the source; `.codex/agents|skills` are GENERATED mirrors
  (`npm run sync-agents`). Never edit `.codex/agents` or `.codex/skills` by hand.
- `.claude/settings.json` allowlists routine read and verification commands and denies
  destructive git operations. Extend the allowlist rather than routing around it; never
  remove a deny entry without explicit owner approval.
