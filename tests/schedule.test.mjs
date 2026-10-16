import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./harness.mjs";

const plain = (v) => JSON.parse(JSON.stringify(v));

function check(user) {
  const { run, context } = loadApp();
  context.input = user;
  return plain(run("validateCfg_(normalizeCfg_(input, DEFAULT_CFG))")).join(
    "\n",
  );
}

test("times parse to day fractions; invalid times are rejected", () => {
  const { run } = loadApp();
  assert.equal(run('parseTime_("07:30")'), 450 / 1440);
  assert.equal(run('parseTime_("7:05")'), 425 / 1440);
  assert.equal(run('parseTime_("00:00")'), 0);
  assert.equal(run('parseTime_("23:59")'), 1439 / 1440);
  for (const bad of ["24:00", "7:5", "07-30", "", "noon", "12:60"]) {
    assert.equal(run(`parseTime_(${JSON.stringify(bad)})`), null, bad);
  }
});

test("the demo schedule and activity base are valid and neutral", () => {
  const { run } = loadApp();
  assert.equal(check({}), "");
  const cfg = plain(run("cfg_()"));
  assert.ok(cfg.activities.length >= 15);
  assert.ok(cfg.schedule.length >= 5);
  for (const b of cfg.schedule)
    assert.ok(cfg.activities.includes(b.activity), b.activity);
});

test("schedule validation names the block and the field", () => {
  assert.match(
    check({ schedule: [{ start: "7", end: "08:00", activity: "Work" }] }),
    /block #1: start must be a time HH:MM/,
  );
  assert.match(
    check({ schedule: [{ start: "07:00", end: "08:00", activity: "" }] }),
    /block #1: empty activity/,
  );
  assert.match(
    check({
      schedule: [
        { start: "07:00", end: "08:00", activity: "Work", place: "x" },
      ],
    }),
    /unknown field «place»/,
  );
  assert.match(
    check({
      schedule: [{ start: "07:00", end: "08:00", activity: "Work", notes: 5 }],
    }),
    /notes must be a text/,
  );
  assert.equal(
    check({ schedule: [{ start: "23:00", end: "07:00", activity: "Sleep" }] }),
    "",
  );
  assert.equal(
    check({
      schedule: [{ start: "09:00", end: "10:00", activity: "Not in the base" }],
    }),
    "",
  );
});

test("activity base validation: non-empty, unique, at most 100", () => {
  assert.match(
    check({ activities: ["Work", "Work"] }),
    /Duplicate activity: Work/,
  );
  assert.match(
    check({ activities: ["Work", ""] }),
    /Activity #2: must be a non-empty text/,
  );
  assert.match(
    check({ activities: Array.from({ length: 101 }, (_, i) => `A${i}`) }),
    /100 at most/,
  );
});

test("kept sheet data wins over the config; a missing sheet falls back to the config", () => {
  const { run, context } = loadApp();
  context.kept = { schedule: [["06:00", "06:30", "Run", ""]] };
  assert.deepEqual(plain(run("scheduleRows_(kept)")), [
    ["06:00", "06:30", "Run", ""],
  ]);
  context.emptied = { schedule: [] };
  assert.deepEqual(plain(run("scheduleRows_(emptied)")), []);
  context.old = { tasks: [] };
  assert.equal(plain(run("scheduleRows_(old)"))[0][0], "07:00");
  assert.equal(plain(run("scheduleRows_(null)"))[0][0], "07:00");
});

test("readSchedule_ keeps non-empty rows as displayed text and drops the duration", () => {
  const { run, context } = loadApp();
  context.fake = {
    getLastRow: () => 4,
    getRange: () => ({
      getDisplayValues: () => [
        ["07:00", "07:30", "Morning routine", "0:30", "water"],
        ["", "", "", "", ""],
        ["", "", "Reading", "", " "],
      ],
    }),
  };
  assert.deepEqual(plain(run("readSchedule_(fake)")), [
    ["07:00", "07:30", "Morning routine", "water"],
    ["", "", "Reading", ""],
  ]);
});

test("user text never becomes a formula", () => {
  const { run } = loadApp();
  assert.equal(run('asText_("=1+1")'), "'=1+1");
  assert.equal(run('asText_("Work")'), "Work");
  assert.equal(run("asText_(undefined)"), "");
});
