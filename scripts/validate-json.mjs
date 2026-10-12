// Validates that tracked JSON files parse and that the example config has the expected shape.
import { readFileSync } from 'node:fs';

const files = ['config.example.json', 'src/appsscript.json', 'package.json'];
const requiredKeys = ['timezone', 'daysToCreate', 'xpPerLevel', 'coinsPerXp', 'streakThreshold', 'habits', 'tasks', 'rewards'];
let failed = false;

for (const f of files) {
  try {
    const data = JSON.parse(readFileSync(f, 'utf8'));
    if (f === 'config.example.json') {
      const missing = requiredKeys.filter((k) => !(k in data));
      if (missing.length) throw new Error(`missing keys: ${missing.join(', ')}`);
    }
    console.log(`ok  ${f}`);
  } catch (e) {
    failed = true;
    console.error(`ERR ${f}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
