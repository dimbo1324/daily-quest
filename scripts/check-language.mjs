// Repository language policy: everything tracked by git is English. Fails on any Cyrillic
// character in a tracked text file. Personal, localized data belongs in git-ignored files.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const RANGES = [[0x0400, 0x052f], [0x2de0, 0x2dff], [0xa640, 0xa69f]];
const isCyrillic = (line) => [...line].some((ch) => RANGES.some(([a, b]) => ch.codePointAt(0) >= a && ch.codePointAt(0) <= b));
const BINARY = /\.(png|jpe?g|gif|ico|pdf|xlsx|zip|rar|woff2?)$/i;

const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\0').filter((f) => f && !BINARY.test(f));

const hits = [];
for (const file of files) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  text.split('\n').forEach((line, i) => { if (isCyrillic(line)) hits.push(`${file}:${i + 1}`); });
}

if (hits.length) {
  console.error('ERR non-English (Cyrillic) text in tracked files:\n  ' + hits.slice(0, 50).join('\n  '));
  process.exit(1);
}
console.log(`ok  language: ${files.length} files, English only`);
