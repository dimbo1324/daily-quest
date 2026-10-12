# Security

- The script runs with `@OnlyCurrentDoc`: access to the current spreadsheet only.
- No secrets are required. Any future API keys go to **Apps Script → Project Settings → Script properties**, never into code or committed files.
- Personal data (`my-config.json`) and clasp credentials are git-ignored; CI fails if they are committed.
- The spreadsheet itself holds personal data: the `Logs` sheet records every edit and the
  imported config. Share the spreadsheet only with people who may see all of it.

If you find a vulnerability, please do not open a public issue — contact the maintainer via GitHub (@dimbo1324).

If a secret was ever committed: revoke/rotate it first, then remove it from history (`git filter-repo`), since deleting the file is not enough.
