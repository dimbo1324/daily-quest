<!-- tier: extended -->

# Config Reference: Format, Storage and Localization

> **Essence.** Config v2 is a JSON object of optional keys (schema: `config.schema.json`); habits, tasks and rewards are objects, v1 tuples still load; the personal config lives in chunked document properties; every UI string is overridable through `strings`.

## Keys

| Key | Type | Meaning |
|---|---|---|
| `timezone` | IANA zone | spreadsheet and date math zone |
| `startDate` | `YYYY-MM-DD` or `""` | first calendar day; empty = day of the first build |
| `endDate` | `YYYY-MM-DD` or `""` | last calendar day; needs `startDate`; span ≤ 1100 days |
| `daysToCreate` | 7–400 | calendar length when `endDate` is empty |
| `xpPerLevel`, `coinsPerXp`, `streakThreshold` | numbers | game balance (also editable on the Settings sheet) |
| `categories` | 1–12 names | task categories |
| `habits` | `{ name, xp, days }[]` | `days`: `all`, `monsat`, `monfri`, `sat`, `sun` |
| `tasks` | `{ title, category, deadline, priority, xp }[]` | initial tasks (first build only); `priority`: `high`, `medium`, `low` (a label is accepted and mapped) |
| `rewards` | `{ name, price }[]` | initial shop rewards (first build only) |
| `strings` | `{ key: text }` | UI overrides; keys and defaults are `STRINGS_EN` |

Unknown keys and unknown fields are validation errors (typos must not pass silently). A new
habit kind (for example "avoid" habits) is a new field added through the one-pass procedure
in `12-domain-rules.md`.

## Calendar period

`calendarPeriod_(cfg, today, firstKeptDate)`: start = `startDate` or today, moved earlier
when kept data starts earlier (no tick is lost); end = `endDate`, or
`max(today, start) + daysToCreate - 1`. `onOpen` appends 30 days when fewer than 14 remain.

## Storage

- Personal config: document properties `dq_config_0..N` plus `dq_config_chunks`
  (2800 UTF-16 units per chunk; a property value holds at most 9 kB). A legacy single
  `dq_config` value is still read.
- Other properties: `dq_version`, `dq_built_at`, `dq_last_backup`.
- User data backup: hidden sheet `_backup`, JSON in 40,000-character cells.

## Applying a personal config

Menu «⚙️ Settings → 📥 Import from JSON», paste `my-config.json`. Keys present replace the
current ones; the tracker is rebuilt with data kept (backup first). Export writes the
effective config back, with `$schema` for editor completion.

## Localization

`t_(key, ...args)` returns the override from `strings` or the English default; `{0}` style
placeholders. Arrays: `weekdays` (exactly 7), `ranks`, `settings.help`. Changing sheet names
renames the sheets on the next rebuild; state is exported with the old names first.
