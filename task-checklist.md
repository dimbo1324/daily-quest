# Task: Stats sheet with charts and infographics, faster builds (v2.4.0)

Owner instruction of 2026-10-12: more charts, diagrams and infographics to see progress
visually (at least two kinds), and further build optimization.

Design: a new `Stats` sheet (live formulas, no user data):
- KPI tiles: best streak, perfect days, ticks, 30-day average with a sparkline;
- a 26-week calendar heatmap of habit completion with a legend;
- charts: total XP over time (area), XP per week by source (stacked columns), XP by source
  (donut), habit completion and rules kept over 30 days (bars), completion by weekday
  (columns).
Optimization: dashboard and stats cells written in one batch call instead of one call per
cell.

Marks: `[ ]` open, `+` done, `-` not done or partially done (with a note).

## 1. Implementation

+ `src/stats.js`: data block, tiles, heatmap, charts, styling
+ Batch cell writing for Dashboard and Stats
+ Sheet wiring: names, build order, styling, protection, tab color
+ English UI strings; Russian strings in the personal config

## 2. Verification

+ Tests (chart anchor math, sheet names), `npm run check` green
+ Manual test plan updated

## 3. Completion

+ Docs, changelog, version 2.4.0, rule modules synced
+ Merge into `main`
