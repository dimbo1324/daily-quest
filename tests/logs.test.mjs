import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./harness.mjs";

/** A spreadsheet fake with named sheets that records appended rows. */
function fakeSpreadsheet(context) {
  const sheets = new Map();
  const makeSheet = (name) => {
    const sheet = {
      name,
      rows: [],
      getName: () => name,
      appendRow: (row) => {
        sheet.rows.push(row);
      },
      getRange: () => anything(),
      getMaxRows: () => 10,
      getMaxColumns: () => 7,
      getProtections: () => [],
      protect: () => anything(),
      setHiddenGridlines() {},
      setColumnWidth() {},
      setFrozenRows() {},
      setTabColor() {},
    };
    sheets.set(name, sheet);
    return sheet;
  };
  const anything = () =>
    new Proxy(function () {}, {
      get: (_, k) => (k === "then" ? undefined : () => anything()),
      apply: () => anything(),
    });
  const ss = {
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => makeSheet(n),
    getNumSheets: () => sheets.size,
  };
  context.SpreadsheetApp = new Proxy(
    {},
    {
      get: (_, k) =>
        k === "getActive"
          ? () => ss
          : k === "ProtectionType"
            ? { SHEET: "SHEET" }
            : k === "BorderStyle"
              ? {}
              : anything(),
    },
  );
  return { sheets, makeSheet };
}

test("logEvent_ creates the Logs sheet and appends a timestamped row", () => {
  const { run, context } = loadApp();
  const { sheets } = fakeSpreadsheet(context);
  run('logEvent_("build", { details: "version 1" })');
  const logs = sheets.get("Logs");
  assert.ok(logs);
  assert.equal(logs.rows.length, 1);
  const [time, event, , , , , details] = logs.rows[0];
  assert.match(time, /^\d{4}-\d{2}-\d{2}/);
  assert.equal(event, "build");
  assert.equal(details, "version 1");
});

test("logged values are never parsed as formulas and are capped to a cell", () => {
  const { run } = loadApp();
  assert.equal(run('logText_("=HYPERLINK(1)")'), "'=HYPERLINK(1)");
  assert.equal(run('logText_("-5")'), "'-5");
  assert.equal(run("logText_(undefined)"), "");
  assert.equal(run("logText_([[1, 2]])"), "[[1,2]]");
  const long = run('logText_("x".repeat(50000))');
  assert.ok(long.length < 45100);
  assert.match(long, /\[\+5000\]$/);
});

test("logEdit_ records a single-cell edit with old and new value", () => {
  const { run, context } = loadApp();
  const { sheets, makeSheet } = fakeSpreadsheet(context);
  const tasks = makeSheet("Tasks");
  tasks.getRange = (row, col) => ({
    getValue: () => (row === 1 && col === 2 ? "Task" : ""),
  });
  context.ev = {
    oldValue: "old",
    value: "new",
    range: {
      getSheet: () => tasks,
      getNumRows: () => 1,
      getNumColumns: () => 1,
      getA1Notation: () => "B5",
      getRow: () => 5,
      getColumn: () => 2,
    },
  };
  run("logEdit_(ev)");
  const row = sheets.get("Logs").rows[0];
  assert.deepEqual(JSON.parse(JSON.stringify(row.slice(1))), [
    "edit",
    "Tasks",
    "B5",
    "old",
    "new",
    "Task",
  ]);
});

test("edits on the Logs and backup sheets are not logged", () => {
  const { run, context } = loadApp();
  const { sheets, makeSheet } = fakeSpreadsheet(context);
  for (const name of ["Logs", "_backup"]) {
    const sh = sheets.get(name) || makeSheet(name);
    context.ev = {
      range: {
        getSheet: () => sh,
        getNumRows: () => 1,
        getNumColumns: () => 1,
        getA1Notation: () => "A2",
      },
    };
    run("logEdit_(ev)");
  }
  assert.equal(sheets.get("Logs").rows.length, 0);
});

test("logging never throws, even without a spreadsheet", () => {
  const { run } = loadApp();
  assert.doesNotThrow(() => run('logEvent_("open")'));
});

test("a UI sheet may not be renamed to Logs", () => {
  const { run, context } = loadApp();
  context.input = { strings: { "sheet.shop": "Logs" } };
  assert.match(
    run("validateCfg_(normalizeCfg_(input, DEFAULT_CFG))").join(),
    /«Logs»/,
  );
});
