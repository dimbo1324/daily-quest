// Keeps every AI assistant on one rule set ("one brain").
//
// Sources of truth:
//   .ai/universal/*.md, .ai/project/*.md   rule modules (CLAUDE.md imports them natively)
//   .claude/agents/*.md                     project subagents
//   .claude/skills/<name>/SKILL.md          project skills
// Generated here (never edit by hand):
//   AGENTS.md                               rule modules assembled for Codex and other tools
//   .codex/agents/<name>.toml               Codex mirror of .claude/agents
//   .codex/skills/<name>/SKILL.md           Codex mirror of .claude/skills
//
// Usage: node scripts/sync-agents.mjs [--check]
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CHECK = process.argv.includes('--check');
// Codex reads at most 32 KiB of project instructions; failing here names the problem instead
// of letting rules be truncated silently.
const BUDGET_KIB = 30;
const TIER_MARKER = 'tier: extended';
const ESSENCE = '> **Essence.**';

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const outputs = new Map();

// ── AGENTS.md ───────────────────────────────────────────────────────────────
const modules = ['universal', 'project'].flatMap((group) =>
  readdirSync(join('.ai', group)).filter((f) => f.endsWith('.md')).sort()
    .map((f) => ({ path: `.ai/${group}/${f}`, body: read(join('.ai', group, f)).trim() })));

const isExtended = (m) => m.body.split('\n').slice(0, 5).some((l) => l.includes(TIER_MARKER));
const titleOf = (m) => (m.body.split('\n').find((l) => l.startsWith('# ')) || '# (untitled)').slice(2).trim();
const essenceOf = (m) => {
  const line = m.body.split('\n').find((l) => l.trim().startsWith(ESSENCE));
  return line ? line.trim().slice(ESSENCE.length).trim() : '';
};

const banner = `<!--
GENERATED FILE - DO NOT EDIT.
Source of truth: .ai/universal/*.md and .ai/project/*.md.
Edit a module, then run: npm run sync-agents
-->

# Daily Quest - working notes for Codex and other AI assistants

This file is the entry point for Codex and any tool that reads AGENTS.md. It is assembled
from the shared rule modules in \`.ai/\`, so every assistant follows identical rules. Later
sections override earlier ones; an explicit owner instruction in the current conversation
overrides everything. Start every task with the orientation ritual in the progress module.`;

const sections = [banner];
for (const m of modules.filter((x) => !isExtended(x))) sections.push(`<!-- module: ${m.path} -->\n\n${m.body}`);
const extended = modules.filter(isExtended);
if (extended.length) {
  let index = '<!-- module index: extended -->\n\n# Modules loaded on demand\n\n' +
    'These rules bind exactly like the inlined ones; only their full text lives\n' +
    'outside this file, to stay within the instruction budget. Read the file itself\n' +
    'when a task touches it — that is an obligation, not a suggestion.\n';
  for (const m of extended) index += `\n## ${titleOf(m)}\n\nFile: \`${m.path}\`\n` + (essenceOf(m) ? `\n${essenceOf(m)}\n` : '');
  sections.push(index.trimEnd());
}
const agentsMd = sections.join('\n\n---\n\n') + '\n';
const kib = Buffer.byteLength(agentsMd, 'utf8') / 1024;
if (kib > BUDGET_KIB) {
  console.error(`ERR AGENTS.md would be ${kib.toFixed(1)} KiB; the budget is ${BUDGET_KIB} KiB. ` +
    'Tighten a module, or mark a situational one `<!-- tier: extended -->` with a `> **Essence.**` line.');
  process.exit(1);
}
outputs.set('AGENTS.md', agentsMd);

// ── .codex/agents mirror ────────────────────────────────────────────────────
function frontmatter(text, file) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`${file}: missing frontmatter`);
  const meta = Object.fromEntries(m[1].split('\n').filter((l) => l.includes(':'))
    .map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
  return { meta, body: m[2].trim() };
}
const tomlString = (s) => JSON.stringify(s);

const agentFiles = readdirSync('.claude/agents').filter((f) => f.endsWith('.md')).sort();
for (const f of agentFiles) {
  const { meta, body } = frontmatter(read(join('.claude/agents', f)), f);
  if (body.includes("'''")) throw new Error(`${f}: body must not contain '''`);
  const short = meta.name;
  outputs.set(`.codex/agents/${short}.toml`, [
    '# GENERATED from .claude/agents/' + f + ' by npm run sync-agents - do not edit.',
    `name = ${tomlString(meta.name)}`,
    `description = ${tomlString(meta.description)}`,
    `model_reasoning_effort = ${tomlString(meta.effort || 'high')}`,
    "developer_instructions = '''",
    body,
    "'''",
    '',
  ].join('\n'));
}

// ── .codex/skills mirror ────────────────────────────────────────────────────
const skillDirs = readdirSync('.claude/skills', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
for (const s of skillDirs) {
  const body = read(join('.claude/skills', s, 'SKILL.md'));
  frontmatter(body, `${s}/SKILL.md`);
  outputs.set(`.codex/skills/${s}/SKILL.md`, body.replace(/^---\n/, `---\n# GENERATED from .claude/skills/${s}/SKILL.md by npm run sync-agents - do not edit.\n`));
}

// ── compare / write ─────────────────────────────────────────────────────────
const generatedDirs = ['.codex/agents', '.codex/skills'];
const existingGenerated = generatedDirs.flatMap((dir) => (existsSync(dir) ? walk(dir) : []));
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name).replace(/\\/g, '/')]);
}

const stale = existingGenerated.filter((p) => !outputs.has(p));
const changed = [...outputs].filter(([p, c]) => !existsSync(p) || read(p) !== c).map(([p]) => p);

if (CHECK) {
  if (changed.length || stale.length) {
    console.error('ERR assistant files are out of sync. Run: npm run sync-agents\n  ' + [...changed, ...stale].join('\n  '));
    process.exit(1);
  }
  console.log(`ok  assistants in sync (AGENTS.md ${kib.toFixed(1)} of ${BUDGET_KIB} KiB, ${agentFiles.length} agents, ${skillDirs.length} skills)`);
} else {
  for (const p of stale) rmSync(p);
  for (const p of changed) {
    mkdirSync(p.split('/').slice(0, -1).join('/') || '.', { recursive: true });
    writeFileSync(p, outputs.get(p));
  }
  console.log(`ok  synced ${changed.length} file(s), removed ${stale.length} (AGENTS.md ${kib.toFixed(1)} of ${BUDGET_KIB} KiB)`);
}
