# AI Assistant Rule Modules

Single source of truth for the rules that govern every AI assistant (Claude Code, Codex,
Gemini, Copilot, Cursor, and any future agent) working in this repository. The goal: any
model, in any session, can find out what the project is, where it stands and how to work in
it — from files, not from a lost conversation.

## How it works

```text
.ai/universal/*.md   Portable rules, valid for ANY project. No project names, paths, or
                     stack specifics. Adopted from the owner's codepack / CogniBoiler.
.ai/project/*.md     Rules for THIS project: map, commands, domain rules, progress
                     tracking, config reference.
CLAUDE.md            Claude Code entry point; imports every module with native @path.
AGENTS.md            GENERATED: the modules assembled into one file for Codex and every
                     tool that reads AGENTS.md. Never edit by hand.
GEMINI.md            Thin pointer for Gemini CLI to AGENTS.md.
.claude/agents|skills  Source of the project subagents and skills.
.codex/agents|skills   GENERATED mirror of .claude/ for Codex.
.ai/CHANGELOG.md     History of rule changes: what, why, when, who decided.
```

Modules load in filename order: `universal/01..NN` first, then `project/10..NN`. Project
rules win over universal rules when they conflict.

## Editing rules

1. Edit or add a module under `.ai/universal/` or `.ai/project/` (or an agent or skill under
   `.claude/`).
2. Record the change in `.ai/CHANGELOG.md`.
3. Regenerate: `npm run sync-agents` (writes `AGENTS.md` and `.codex/agents|skills`).
4. Commit the source, the changelog entry and the regenerated files together.

`npm run check` fails while anything generated is out of date. `CLAUDE.md` needs no
regeneration: Claude Code resolves `@` imports at session start.

The protocol for changing rules — when it is allowed, who decides — is
`universal/08-rules-evolution.md`. Read it before touching a module.

## Size budget and module tiers

Codex reads at most 32 KiB of project instructions; `sync-agents` fails above 30 KiB.

- **inline** (default) — embedded in `AGENTS.md` in full.
- **extended** — only the title, path and essence are embedded. Opt in with
  `<!-- tier: extended -->` in the first five lines, and put
  `> **Essence.** One sentence covering the module's core rules.` right after the title.

Extended modules bind exactly like inline ones. `CLAUDE.md` imports every module regardless
of tier.
