import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./harness.mjs";

const plain = (v) => JSON.parse(JSON.stringify(v));

test("bulk task ticks: untitled rows are undone, ticked rows get a date, unticked lose it", () => {
  const { run, context } = loadApp();
  context.ab = [
    [true, "Call"],
    [true, ""],
    [false, "Old"],
    [true, "Kept date"],
  ];
  context.kept = run("new Date(Date.UTC(2026, 9, 1))");
  context.done = [[""], [""], [context.kept], [context.kept]];
  context.now = run("new Date(Date.UTC(2026, 9, 16))");
  const plan = run("planTaskTicks_(ab, done, now)");
  assert.equal(plan.undone, 1);
  assert.deepEqual(plain(plan.ticks), [[true], [false], [false], [true]]);
  assert.equal(plan.done[0][0], context.now);
  assert.equal(plan.done[1][0], "");
  assert.equal(plan.done[2][0], "");
  assert.equal(plan.done[3][0], context.kept);
});

test("Settings parameters are read one by one within their ranges", () => {
  const { run } = loadApp();
  assert.deepEqual(plain(run("paramsFromCells_([300, 0, 0.8])")), {
    xpPerLevel: 300,
    coinsPerXp: 0,
    streakThreshold: 0.8,
  });
  assert.deepEqual(plain(run('paramsFromCells_(["", -1, 2])')), {});
});

test("habit and rule XP may be 0 (the Settings sheet allows it)", () => {
  const { run, context } = loadApp();
  context.input = {
    habits: [{ name: "Free", xp: 0, days: "all" }],
    rules: [{ name: "Keep", xp: 0, kind: "keep", days: "all" }],
  };
  assert.deepEqual(
    plain(run("validateCfg_(normalizeCfg_(input, DEFAULT_CFG))")),
    [],
  );
});

test("sheet names must differ even ignoring case; reserved names too", () => {
  const { run, context } = loadApp();
  const check = (strings) => {
    context.input = { strings };
    return plain(run("validateCfg_(normalizeCfg_(input, DEFAULT_CFG))")).join();
  };
  assert.match(
    check({ "sheet.tasks": "habits" }),
    /sheet names must be unique/,
  );
  assert.match(check({ "sheet.shop": "LOGS" }), /sheet names must be unique/);
  assert.equal(check({ "sheet.shop": "Store" }), "");
});

test("an interrupted build makes the next rebuild use the backup, not the broken sheets", () => {
  const { run, context, docProps } = loadApp();
  context.SpreadsheetApp = {
    getActive: () => ({ getSheetByName: () => null }),
  };
  run("setBuildIncomplete_(true)");
  assert.equal(run("buildIncomplete_()"), true);
  context.backup = { habits: { "2026-10-15": ["Run"] }, exportedAt: "x" };
  run("readBackup_ = () => backup; logEvent_ = () => {};");
  const got = run("captureState_()");
  assert.equal(got.recovered, true);
  assert.equal(got.state, context.backup);
  run("setBuildIncomplete_(false)");
  assert.equal(docProps.getProperty("dq_build_incomplete"), null);
});

test("days with nothing planned are neutral: no share, streak carried over", () => {
  const { run, context } = loadApp();
  const grids = [];
  const sheet = new Proxy(
    {},
    {
      get: (_, k) =>
        k === "getLastRow"
          ? () => 2
          : k === "getRange"
            ? () => ({
                setFormulasR1C1: (g) => grids.push(g),
                setValues: () => {},
                setDataValidations: () => {},
              })
            : () => {},
    },
  );
  context.sh = sheet;
  context.SpreadsheetApp = {
    newDataValidation: () => ({
      requireCheckbox: () => ({ build: () => ({}) }),
    }),
  };
  run('appendDays_(sh, tracker_("habits"), 1, [2026, 10, 13], true)');
  const row = grids[grids.length - 1][0];
  assert.match(row[1], /^=IF\(COUNTIF\(.*\)=0,"",/);
  assert.match(row[2], /IF\(RC\[-1\]="",N\(R\[-1\]C\)/);
});
