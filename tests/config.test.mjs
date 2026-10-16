import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { loadApp, topLevelDeclarations } from "./harness.mjs";

const example = JSON.parse(
  readFileSync(new URL("../config.example.json", import.meta.url), "utf8"),
);
const plain = (v) => JSON.parse(JSON.stringify(v));

function app(personal) {
  const a = loadApp();
  if (personal) a.docProps.setProperty("dq_config", JSON.stringify(personal));
  return a;
}

test("no top-level name is declared in two src files", () => {
  const seen = new Map();
  for (const { file, name } of topLevelDeclarations()) {
    assert.ok(
      !seen.has(name),
      `${name} is declared in ${seen.get(name)} and ${file}`,
    );
    seen.set(name, file);
  }
});

test("DEFAULT_CFG equals config.example.json", () => {
  const { run } = app();
  const defaults = plain(run("DEFAULT_CFG"));
  const { $schema, ...rest } = example;
  assert.equal($schema, "./config.schema.json");
  assert.deepEqual({ ...rest, strings: {} }, defaults);
});

test("the example config is valid", () => {
  const { run, context } = app();
  context.input = example;
  assert.deepEqual(
    plain(run("validateCfg_(normalizeCfg_(input, DEFAULT_CFG))")),
    [],
  );
});

test("legacy tuple configs are normalized into objects", () => {
  const { run } = app({
    habits: [["Walk", 10, "all"]],
    tasks: [["Call", "Work", "2026-10-20", "high", 15]],
    rewards: [["Tea", 5]],
  });
  const cfg = plain(run("cfg_()"));
  assert.deepEqual(cfg.habits, [{ name: "Walk", xp: 10, days: "all" }]);
  assert.deepEqual(cfg.tasks, [
    {
      title: "Call",
      category: "Work",
      deadline: "2026-10-20",
      priority: "high",
      xp: 15,
    },
  ]);
  assert.deepEqual(cfg.rewards, [{ name: "Tea", price: 5 }]);
  assert.deepEqual(plain(run("validateCfg_(cfg_())")), []);
});

test("a priority given by its label (English or overridden) maps to its key", () => {
  const { run } = app({
    strings: { "priority.low": "Later" },
    tasks: [
      {
        title: "A",
        category: "Work",
        deadline: "",
        priority: "🔥 High",
        xp: 1,
      },
      { title: "B", category: "Work", deadline: "", priority: "Later", xp: 1 },
    ],
  });
  assert.deepEqual(plain(run("cfg_().tasks.map(t => t.priority)")), [
    "high",
    "low",
  ]);
});

test("validation reports precise problems", () => {
  const { run, context } = app();
  const check = (user) => {
    context.input = user;
    return plain(run("validateCfg_(normalizeCfg_(input, DEFAULT_CFG))"));
  };
  assert.match(
    check({ startDate: "2026-02-30" }).join(),
    /startDate must be YYYY-MM-DD/,
  );
  assert.match(
    check({ endDate: "2027-01-01" }).join(),
    /endDate needs startDate/,
  );
  assert.match(
    check({ startDate: "2027-01-02", endDate: "2027-01-01" }).join(),
    /endDate must not be before startDate/,
  );
  assert.match(
    check({ startDate: "2026-01-01", endDate: "2030-01-01" }).join(),
    /at most 1100 days/,
  );
  assert.match(check({ colour: "red" }).join(), /Unknown settings: colour/);
  assert.match(
    check({ habits: [{ name: "X", xp: 1, days: "often" }] }).join(),
    /unknown days/,
  );
  assert.match(
    check({
      habits: [{ name: "X", xp: 1, days: "all", kind: "avoid" }],
    }).join(),
    /unknown field «kind»/,
  );
  assert.match(
    check({
      habits: [
        { name: "X", xp: 1, days: "all" },
        { name: "X", xp: 2, days: "all" },
      ],
    }).join(),
    /Duplicate habit/,
  );
  assert.match(
    check({
      tasks: [
        { title: "T", category: "Nope", deadline: "", priority: "high", xp: 1 },
      ],
    }).join(),
    /unknown category/,
  );
  assert.match(
    check({ strings: { "no.such.key": "x" } }).join(),
    /unknown key/,
  );
  assert.match(check({ strings: { weekdays: ["a", "b"] } }).join(), /7 names/);
  assert.match(
    check({ strings: { "sheet.tasks": "Habits" } }).join(),
    /sheet names must be unique/,
  );
});

test("calendar period: explicit start and end dates span a full year", () => {
  const { run } = app({ startDate: "2026-10-13", endDate: "2027-10-12" });
  const [start, days] = plain(
    run('calendarPeriod_(cfg_(), [2026, 10, 12], "")'),
  );
  assert.deepEqual(start, [2026, 10, 13]);
  assert.equal(days, 365);
});

test("calendar period: without dates it starts today and lasts daysToCreate days", () => {
  const { run } = app();
  const [start, days] = plain(
    run('calendarPeriod_(cfg_(), [2026, 10, 12], "")'),
  );
  assert.deepEqual(start, [2026, 10, 12]);
  assert.equal(days, 60);
});

test("calendar period: earlier kept data extends the start backwards", () => {
  const { run } = app({ startDate: "2026-10-13", endDate: "2027-10-12" });
  const [start, days] = plain(
    run('calendarPeriod_(cfg_(), [2026, 11, 1], "2026-10-01")'),
  );
  assert.deepEqual(start, [2026, 10, 1]);
  assert.equal(days, 377);
});

test("calendar period: a future start without an end runs daysToCreate days from the start", () => {
  const { run } = app({ startDate: "2026-12-01" });
  const [start, days] = plain(
    run('calendarPeriod_(cfg_(), [2026, 10, 12], "")'),
  );
  assert.deepEqual(start, [2026, 12, 1]);
  assert.equal(days, 60);
});

test("UI strings: English by default, overrides and placeholders apply", () => {
  const { run } = app({
    strings: {
      "sheet.habits": "Gewohnheiten",
      "msg.bought": "Gekauft: {0} ({1})",
    },
  });
  assert.equal(run('t_("sheet.tasks")'), "Tasks");
  assert.equal(run("names_().habits"), "Gewohnheiten");
  assert.equal(run("names_().backup"), "_backup");
  assert.equal(run('t_("msg.bought", "Tea", 3)'), "Gekauft: Tea (3)");
  assert.equal(run('tq_("tasks.left")'), '"⏳ Left"');
  assert.throws(() => run('t_("missing.key")'), /Unknown UI string/);
});

test("every string key used in src exists in STRINGS_EN", () => {
  const { run } = app();
  const keys = new Set(Object.keys(run("STRINGS_EN")));
  const dir = new URL("../src/", import.meta.url);
  const src = readdirSync(dir)
    .filter((f) => f.endsWith(".js") && f !== "i18n.js")
    .map((f) => readFileSync(new URL(f, dir), "utf8"))
    .join("\n");
  const used = [...src.matchAll(/\bt[q]?_\(["']([\w.]+)["']/g)].map(
    (m) => m[1],
  );
  assert.ok(used.length > 50);
  for (const k of used) assert.ok(keys.has(k), `missing UI string ${k}`);
});

test("a large config survives the chunked document-property storage", () => {
  const { run, docProps, context } = app();
  const habits = Array.from({ length: 40 }, (_, i) => ({
    name: `Habit ${i} ` + "é🎯—".repeat(60),
    xp: 10,
    days: "all",
  }));
  context.input = { habits };
  run("setCfg_(normalizeCfg_(input, DEFAULT_CFG)); saveCfg_()");
  const chunks = Number(docProps.getProperty("dq_config_chunks"));
  assert.ok(chunks > 1);
  for (const k of docProps.getKeys()) {
    assert.ok(
      Buffer.byteLength(docProps.getProperty(k), "utf8") <= 9 * 1024,
      `${k} exceeds 9 kB`,
    );
  }
  run("setCfg_(null)");
  assert.deepEqual(plain(run("cfg_().habits")), habits);
});

test("rules: the demo config ships keep and avoid rules", () => {
  const { run } = app();
  const kinds = plain(run("cfg_().rules.map(r => r.kind)"));
  assert.ok(kinds.includes("keep") && kinds.includes("avoid"));
  assert.deepEqual(plain(run("trackers_().map(t => t.key)")), [
    "habits",
    "rules",
    "routine",
  ]);
});

test("rules: an empty list removes the Rules tracker", () => {
  const { run } = app({ rules: [] });
  assert.deepEqual(plain(run("trackers_().map(t => t.key)")), [
    "habits",
    "routine",
  ]);
  assert.deepEqual(plain(run("validateCfg_(cfg_())")), []);
});

test("rules: validation of kind, days, duplicates and fields", () => {
  const { run, context } = app();
  const check = (rules) => {
    context.input = { rules };
    return plain(run("validateCfg_(normalizeCfg_(input, DEFAULT_CFG))")).join();
  };
  assert.equal(
    check([{ name: "No soda", xp: 10, kind: "avoid", days: "all" }]),
    "",
  );
  assert.match(
    check([{ name: "No soda", xp: 10, kind: "never", days: "all" }]),
    /kind must be one of keep, avoid/,
  );
  assert.match(
    check([{ name: "No soda", xp: 10, kind: "avoid", days: "often" }]),
    /unknown days/,
  );
  assert.match(
    check([{ name: "No soda", xp: -1, kind: "avoid", days: "all" }]),
    /xp must be 0–1000/,
  );
  assert.match(
    check([
      { name: "A", xp: 1, kind: "keep", days: "all" },
      { name: "A", xp: 1, kind: "keep", days: "all" },
    ]),
    /Duplicate rule: A/,
  );
  assert.match(
    check([{ name: "A", xp: 1, kind: "keep", days: "all", note: "x" }]),
    /unknown field «note»/,
  );
  assert.match(
    check(
      Array.from({ length: 31 }, (_, i) => ({
        name: `R${i}`,
        xp: 1,
        kind: "keep",
        days: "all",
      })),
    ),
    /30 at most/,
  );
});

test("trackers: rules have no streak column, habits do", () => {
  const { run } = app();
  const habits = plain(run('trackCols_(tracker_("habits"))'));
  const rules = plain(run('trackCols_(tracker_("rules"))'));
  assert.equal(habits.width, habits.last + 3);
  assert.ok(habits.streak > 0);
  assert.equal(rules.streak, 0);
  assert.equal(rules.width, rules.last + 2);
});

test("stats: chart anchors map pixels onto the 24 px grid starting at column B", () => {
  const { run } = app();
  assert.deepEqual(plain(run("statsAnchor_(0)")), [2, 0]);
  assert.deepEqual(plain(run("statsAnchor_(624)")), [28, 0]);
  assert.deepEqual(plain(run("statsAnchor_(50)")), [4, 2]);
});

test("stats: tiles fit the grid and the data block starts after it", () => {
  const { run } = app();
  const tiles = plain(run("statsTiles_()"));
  assert.equal(tiles.length, 4);
  assert.ok(tiles[3] + 11 <= run("ST.GRID_FIRST + ST.GRID_COLS - 1"));
  assert.ok(run("statsCols_().date") > run("ST.GRID_FIRST + ST.GRID_COLS"));
});

test("writeCells_ helpers: A1 addresses convert to row and column", () => {
  const { run } = app();
  assert.deepEqual(plain(run('a1ToRowCol_("A1")')), [1, 1]);
  assert.deepEqual(plain(run('a1ToRowCol_("BC12")')), [12, 55]);
  assert.throws(() => run('a1ToRowCol_("12A")'), /Bad cell address/);
});

test("sheet names stay unique when Stats is renamed onto another sheet", () => {
  const { run, context } = app();
  context.input = { strings: { "sheet.stats": "Dashboard" } };
  assert.match(
    plain(run("validateCfg_(normalizeCfg_(input, DEFAULT_CFG))")).join(),
    /sheet names must be unique/,
  );
});
