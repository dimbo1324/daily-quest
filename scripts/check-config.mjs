// Validates configs with the script's own validator (the same code that runs in the sheet):
// config.example.json always, my-config.json when it exists locally (it is git-ignored).
// Usage: node scripts/check-config.mjs [file ...]
import { existsSync, readFileSync } from 'node:fs';
import { loadApp } from '../tests/harness.mjs';

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['config.example.json', 'my-config.json'];
let failed = false;

for (const file of files) {
  if (!existsSync(file)) {
    if (file !== 'my-config.json') { console.error(`ERR ${file}: not found`); failed = true; }
    continue;
  }
  try {
    const { run, context } = loadApp();
    context.input = JSON.parse(readFileSync(file, 'utf8'));
    const errors = run('validateCfg_(normalizeCfg_(input, DEFAULT_CFG))');
    if (errors.length) throw new Error('\n  - ' + errors.join('\n  - '));
    const [start, days] = run('calendarPeriod_(normalizeCfg_(input, DEFAULT_CFG), U.todayParts(), "")');
    console.log(`ok  ${file} (calendar: ${start.join('-')}, ${days} days)`);
  } catch (e) {
    failed = true;
    console.error(`ERR ${file}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
