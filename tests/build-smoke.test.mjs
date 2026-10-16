// Smoke test for the sheet builders: runs them against a permissive fake of the Apps Script
// API (every method chains). It cannot prove the sheet looks right, but it catches JavaScript
// errors and formulas assembled from undefined values before code reaches a real spreadsheet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./harness.mjs";

function fakeSheets() {
  const log = { grids: [], charts: 0 };
  const numbers = {
    getMaxRows: 1202,
    getMaxColumns: 80,
    getSheetId: 7,
    getLastRow: 400,
    getColumnWidth: 100,
    getRowHeight: 30,
  };
  const chain = () =>
    new Proxy(function () {}, {
      get(_, key) {
        if (key in numbers) return () => numbers[key];
        if (key === "getCharts") return () => [];
        if (key === "setValues")
          return (grid) => {
            log.grids.push(grid);
            return chain();
          };
        if (key === "insertChart")
          return () => {
            log.charts++;
          };
        if (key === "then") return undefined;
        return () => chain();
      },
      apply: () => chain(),
    });
  return { api: chain(), log };
}

function build(personal) {
  const { run, context, docProps } = loadApp();
  const { api, log } = fakeSheets();
  context.SpreadsheetApp = api;
  context.Charts = { ChartType: new Proxy({}, { get: (_, k) => String(k) }) };
  if (personal) docProps.setProperty("dq_config", JSON.stringify(personal));
  run(
    "buildDashboard_(SpreadsheetApp); styleDashboard_(SpreadsheetApp); buildStats_(SpreadsheetApp); styleStats_(SpreadsheetApp); buildSchedule_(SpreadsheetApp, null); styleSchedule_(SpreadsheetApp)",
  );
  const formulas = log.grids
    .flat(2)
    .filter((v) => typeof v === "string" && v.startsWith("="));
  return { log, formulas };
}

for (const [name, personal, charts] of [
  ["demo config", null, 2 + 6],
  ["no rules", { rules: [] }, 2 + 5],
]) {
  test(`builders run cleanly: ${name}`, () => {
    const { log, formulas } = build(personal);
    assert.equal(log.charts, charts);
    assert.ok(formulas.length > 100);
    const broken = formulas.filter((f) => /undefined|NaN|\[object/.test(f));
    assert.deepEqual(broken, []);
  });
}
