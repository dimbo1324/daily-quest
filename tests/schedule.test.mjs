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
  context.kept = {
    schedule: [
      {
        days: "sat",
        start: "6:00",
        end: "06:30",
        activity: "Run",
        xp: 5,
        notes: "",
      },
    ],
  };
  assert.deepEqual(plain(run("scheduleRows_(kept)")), [
    {
      days: "sat",
      start: "06:00",
      end: "06:30",
      activity: "Run",
      xp: 5,
      notes: "",
    },
  ]);
  context.emptied = { schedule: [] };
  assert.deepEqual(plain(run("scheduleRows_(emptied)")), []);
  context.old = { tasks: [] };
  assert.equal(plain(run("scheduleRows_(old)"))[0].start, "07:00");
  assert.equal(plain(run("scheduleRows_(null)"))[0].start, "07:00");
});

test("v2.6 snapshot rows and blocks without days or XP are migrated", () => {
  const { run, context } = loadApp();
  context.v26 = { schedule: [["07:00", "07:30", "Morning routine", "water"]] };
  assert.deepEqual(plain(run("scheduleRows_(v26)")), [
    {
      start: "07:00",
      end: "07:30",
      activity: "Morning routine",
      notes: "water",
      days: "all",
      xp: 0,
    },
  ]);
  context.input = {
    schedule: [{ start: "07:00", end: "08:00", activity: "Work" }],
  };
  assert.equal(
    plain(run("validateCfg_(normalizeCfg_(input, DEFAULT_CFG))")).join(),
    "",
  );
});

/** A Schedule sheet fake: header row, display values and raw first-column values. */
function fakeSheet(header, shown, raw) {
  return {
    getLastRow: () => shown.length + 1,
    getMaxColumns: () => 40,
    getRange: (row, col, rows, cols) => ({
      getDisplayValues: () =>
        row === 1
          ? [header.slice(0, cols)]
          : shown.map((r) => r.slice(0, cols)),
      getValues: () =>
        (raw || shown.map((r) => [r[0]])).map((r) => r.slice(0, cols)),
    }),
  };
}

test("readSchedule_ reads the v2.6 layout (Start | End | Activity | Duration | Notes)", () => {
  const { run, context } = loadApp();
  context.fake = fakeSheet(
    ["Start", "End", "Activity", "Duration", "Notes"],
    [
      ["07:00", "07:30", "Morning routine", "0:30", "water"],
      ["", "", "", "", ""],
      ["", "", "Reading", "", " "],
    ],
  );
  assert.deepEqual(plain(run("readSchedule_(fake)")), [
    {
      days: "all",
      start: "07:00",
      end: "07:30",
      activity: "Morning routine",
      xp: 0,
      notes: "water",
    },
    { days: "all", start: "", end: "", activity: "Reading", xp: 0, notes: "" },
  ]);
});

test("readSchedule_ reads days as keys or one-off dates, XP as numbers", () => {
  const { run, context } = loadApp();
  const header = [
    "Days",
    "Start",
    "End",
    "Activity",
    "XP",
    "Duration",
    "Notes",
  ];
  const shown = [
    ["Mon–Fri", "09:00", "13:00", "Work", "10", "4:00", ""],
    ["17.10.2026", "10:00", "11:00", "Doctor", "", "1:00", "bring papers"],
    ["10/18/2026", "12:00", "13:00", "Lunch", "", "1:00", ""],
    ["Weird", "18:00", "19:00", "Sport", "x", "1:00", ""],
    ["", "", "", "", "", "", ""],
  ];
  const raw = [
    ["Mon–Fri"],
    ["17.10.2026"],
    [run("new Date(Date.UTC(2026, 9, 18, 12))")],
    ["Weird"],
    [""],
  ];
  context.fake = fakeSheet(header, shown, raw);
  const rows = plain(run("readSchedule_(fake)"));
  assert.deepEqual(
    rows.map((b) => [b.days, b.activity, b.xp, b.notes]),
    [
      ["monfri", "Work", 10, ""],
      ["2026-10-17", "Doctor", 0, "bring papers"],
      ["2026-10-18", "Lunch", 0, ""],
      ["all", "Sport", 0, ""],
    ],
  );
});

test("only complete blocks reach the config; partial rows stay on the sheet", () => {
  const { run, context } = loadApp();
  context.rows = [
    {
      days: "monfri",
      start: "09:00",
      end: "13:00",
      activity: "Work",
      xp: "10",
      notes: "",
    },
    { days: "all", start: "", end: "", activity: "Reading", xp: 0, notes: "" },
    {
      days: "2026-10-17",
      start: "10:00",
      end: "11:00",
      activity: "Doctor",
      xp: 0,
      notes: "",
    },
  ];
  const blocks = plain(run("validScheduleBlocks_(rows)"));
  assert.deepEqual(
    blocks.map((b) => [b.activity, b.xp]),
    [
      ["Work", 10],
      ["Doctor", 0],
    ],
  );
});

test("routine items: weekly blocks with XP, stable unique names", () => {
  const { run } = loadApp();
  const items = plain(
    run(`routineItems_({ schedule: [
      { days: "monfri", start: "09:00", end: "13:00", activity: "Work", xp: 10 },
      { days: "sat", start: "09:00", end: "12:00", activity: "Work", xp: 5 },
      { days: "all", start: "13:00", end: "14:00", activity: "Lunch", xp: 0 },
      { days: "2026-10-17", start: "10:00", end: "11:00", activity: "Doctor", xp: 20 },
      { days: "all", start: "23:00", end: "07:00", activity: "Sleep", xp: 10 },
    ] })`),
  );
  assert.deepEqual(items, [
    { name: "09:00 Work · Mon–Fri", xp: 10, days: "monfri" },
    { name: "09:00 Work · Sat", xp: 5, days: "sat" },
    { name: "23:00 Sleep", xp: 10, days: "all" },
  ]);
});

test("schedule config: days must be a day set or a date, XP a number 0–1000", () => {
  assert.match(
    check({
      schedule: [
        { days: "weekends", start: "07:00", end: "08:00", activity: "X" },
      ],
    }),
    /days must be one of/,
  );
  assert.match(
    check({
      schedule: [
        { days: "2026-02-30", start: "07:00", end: "08:00", activity: "X" },
      ],
    }),
    /days must be one of/,
  );
  assert.match(
    check({
      schedule: [{ start: "07:00", end: "08:00", activity: "X", xp: -1 }],
    }),
    /xp must be a number 0–1000/,
  );
  assert.match(
    check({ schedulePerfectBonus: 5000 }),
    /schedulePerfectBonus must be a number/,
  );
  assert.equal(
    check({
      schedule: [
        { days: "2026-10-17", start: "07:00", end: "08:00", activity: "X" },
      ],
    }),
    "",
  );
});

test("text dates typed in the Days cell are recognized", () => {
  const { run } = loadApp();
  assert.equal(run('isoFromDateText_("17.10.2026")'), "2026-10-17");
  assert.equal(run('isoFromDateText_("7/1/2026")'), "2026-01-07");
  assert.equal(run('isoFromDateText_("2026-10-17")'), "2026-10-17");
  assert.equal(run('isoFromDateText_("31.02.2026")'), "");
  assert.equal(run('isoFromDateText_("Mon")'), "");
});

test("user text never becomes a formula", () => {
  const { run } = loadApp();
  assert.equal(run('asText_("=1+1")'), "'=1+1");
  assert.equal(run('asText_("Work")'), "Work");
  assert.equal(run("asText_(undefined)"), "");
});
