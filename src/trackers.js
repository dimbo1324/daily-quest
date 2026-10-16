/**
 * Day-by-day tracker sheets. Habits, rules and the routine share one layout: row 1 headers,
 * row 2 XP per item, then one row per calendar day with a checkbox per item (or «—» on days the
 * item is not planned), the day's XP and completion share. Habits and the routine also have a
 * streak column driven by the streak threshold; rules are scored per rule (clean streak and
 * 30-day share on the dashboard).
 *
 * Habit and rule XP in row 2 links to the Settings sheet. Routine items are the schedule blocks
 * with XP; their XP is written as values (change it on the Schedule sheet, then rebuild), and a
 * day with every block done earns the perfect-day bonus.
 */

// First column of each item table on the Settings sheet: habits A:C, rules J:M.
const SETTINGS_COL = { habits: 1, rules: 10, activities: 15 };

/** Trackers in sheet order. Rules and routine are optional: no items, no sheet. */
function trackers_() {
  const cfg = cfg_();
  const SH = names_();
  const list = [
    {
      key: "habits",
      sheet: SH.habits,
      items: cfg.habits,
      streak: true,
      xpCol: SETTINGS_COL.habits + 1,
    },
  ];
  if (cfg.rules.length)
    list.push({
      key: "rules",
      sheet: SH.rules,
      items: cfg.rules,
      streak: false,
      xpCol: SETTINGS_COL.rules + 1,
    });
  const routine = routineItems_(cfg);
  if (routine.length)
    list.push({
      key: "routine",
      sheet: SH.routine,
      items: routine,
      streak: true,
      xpCol: null,
      bonus: cfg.schedulePerfectBonus,
    });
  return list;
}

/**
 * Weekly schedule blocks with XP as tracker items { name, xp, days }. The name «HH:MM activity»
 * is the item's identity (ticks follow it): changing a block's start or activity starts a new
 * column. Same start and activity on different day sets get the day set appended.
 */
function routineItems_(cfg) {
  const blocks = cfg.schedule.filter(
    (b) => isPlainObject_(b) && DAYSETS[b.days] && b.xp > 0 && b.activity,
  );
  const base = (b) => b.start + " " + String(b.activity).trim();
  const count = {};
  blocks.forEach((b) => {
    count[base(b)] = (count[base(b)] || 0) + 1;
  });
  return blocks.map((b) => ({
    name: count[base(b)] > 1 ? base(b) + " · " + dayLabel_(b.days) : base(b),
    xp: b.xp,
    days: b.days,
  }));
}

function tracker_(key) {
  return trackers_().filter((t) => t.key === key)[0] || null;
}

function trackCols_(t) {
  const n = t.items.length;
  const first = 3,
    last = 2 + n;
  return {
    n,
    first,
    last,
    xp: last + 1,
    pct: last + 2,
    streak: t.streak ? last + 3 : 0,
    width: last + (t.streak ? 3 : 2),
  };
}

function habitCols_() {
  return trackCols_(tracker_("habits"));
}

function buildTracker_(sh, t, start, days) {
  const c = trackCols_(t);
  const cfgName = U.q(names_().cfg);
  trimSheet_(sh, LAYOUT.FIRST_ROW - 1 + days, c.width);
  const doneLabel = { rules: "rules.kept", routine: "routine.done" };
  const tail = [t_("habits.xp"), t_(doneLabel[t.key] || "habits.done")];
  if (t.streak) tail.push(t_("habits.streak"));
  const header = [t_("habits.date"), t_("habits.day")].concat(
    t.items.map((h) => h.name),
    tail,
  );
  const xpRow = ["", t_("habits.xp")].concat(
    t.items.map((h, i) =>
      t.xpCol ? "=" + cfgName + "!" + U.col(t.xpCol) + (i + 2) : h.xp,
    ),
    tail.map(() => ""),
  );
  sh.getRange(1, 1, 1, c.width).setValues([header]);
  sh.getRange(2, 1, 1, c.width).setValues([xpRow]);
  appendDays_(sh, t, days, start, true);
}

/** Appends n days at the end of a tracker sheet (or from `start` when the sheet is empty). */
function appendDays_(sh, t, n, start, forceFresh) {
  const c = trackCols_(t);
  const last = sh.getLastRow();
  const fresh = forceFresh === true || last < LAYOUT.FIRST_ROW;
  let base;
  if (fresh) {
    base = start || U.todayParts();
  } else {
    const lastIso = lastDateIso_(sh);
    if (!lastIso) throw new Error(t_("err.lastDate", t.sheet));
    base = U.addDays(U.parts(lastIso), 1);
  }
  const startRow = fresh ? LAYOUT.FIRST_ROW : last + 1;
  ensureRows_(sh, startRow + n - 1);

  // Dates and weekdays
  const weekdayF = "=CHOOSE(WEEKDAY(RC1,2)," + quoteList_(t_("weekdays")) + ")";
  const ab = [];
  for (let i = 0; i < n; i++) {
    const dateF =
      i === 0 && fresh
        ? "=DATE(" + base[0] + "," + base[1] + "," + base[2] + ")"
        : "=R[-1]C+1";
    ab.push([dateF, weekdayF]);
  }
  sh.getRange(startRow, 1, n, 2).setFormulasR1C1(ab);

  // Ticks: active days get checkboxes, inactive days get «—». Two batch calls: per-cell
  // range lists over a year-long calendar exceed the Apps Script execution time limit.
  const checkbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  const values = [],
    rules = [];
  for (let i = 0; i < n; i++) {
    const wd = U.weekday(U.addDays(base, i));
    values.push(t.items.map((h) => (DAYSETS[h.days][wd] ? false : "—")));
    rules.push(t.items.map((h) => (DAYSETS[h.days][wd] ? checkbox : null)));
  }
  const block = sh.getRange(startRow, c.first, n, c.n);
  block.setDataValidations(rules);
  block.setValues(values);

  // XP (plus a perfect-day bonus for the routine), completion share and the streak
  const r = "RC" + c.first + ":RC" + c.last;
  const bonus = t.bonus
    ? "+IF(AND(COUNTIF(" +
      r +
      ",TRUE)>0,COUNTIF(" +
      r +
      ",FALSE)=0)," +
      t.bonus +
      ",0)"
    : "";
  const row = [
    "=SUMPRODUCT(--(" +
      r +
      "=TRUE),R2C" +
      c.first +
      ":R2C" +
      c.last +
      ")" +
      bonus,
    "=IFERROR(COUNTIF(" +
      r +
      ",TRUE)/(COUNTIF(" +
      r +
      ",TRUE)+COUNTIF(" +
      r +
      ",FALSE)),0)",
  ];
  if (t.streak)
    row.push(
      '=IF(RC1>TODAY(),"",IF(RC[-1]>=' +
        U.q(names_().cfg) +
        "!R4C6,N(R[-1]C)+1,0))",
    );
  sh.getRange(startRow, c.xp, n, row.length).setFormulasR1C1(
    U.fill(n, 1, null).map(() => row.slice()),
  );
}

/** Appends n days to every tracker sheet and restyles it; returns false when not built. */
function extendTrackers_(n) {
  const list = trackers_()
    .map((t) => ({ t, sh: sheet_(t.sheet) }))
    .filter((x) => x.sh && x.sh.getLastRow() >= LAYOUT.FIRST_ROW);
  if (!list.length) return false;
  list.forEach(({ t, sh }) => {
    appendDays_(sh, t, n);
    styleTracker_(sh, t);
  });
  return true;
}
