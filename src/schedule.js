/**
 * The Schedule sheet: the owner's routine as a weekly template of time blocks.
 *
 *   A Days  B Start  C End  D Activity  E XP  F Duration  G Notes  |  I:L Today  |  N:O summary
 *
 * Days is a weekday set from the drop-down or a date typed by hand (a one-off block: it is added
 * to that day and hides the weekly blocks it overlaps). Blocks with XP become columns of the
 * Routine tracker. «Today», «Now / Next» and the weekly hours are live formulas over hidden
 * helper columns (T:Y) and a day-set lookup table (AA:AH).
 *
 * The sheet holds user data, so rebuilds snapshot it (readSchedule_, display values so times
 * never shift with time-zone history) and write it back. A spreadsheet without the sheet gets
 * the config's `schedule` once. The v2.6 layout (Start | End | Activity | Duration | Notes) is
 * still read, so an upgrade keeps every block.
 */

const SCHEDULE = {
  ROWS: 100,
  COLS: 7,
  DAYS: 1,
  START: 2,
  END: 3,
  ACT: 4,
  XP: 5,
  DUR: 6,
  NOTES: 7,
  TODAY: 9, // I:L
  TODAY_ROWS: 40,
  SUM: 14, // N:O
  HELP: 20, // T today?, U now?, V status, W weekly hours, X routine key, Y sort order
  LOOKUP: 27, // AA label, AB:AH Monday…Sunday flags
};

const MAX_SCHEDULE_BLOCKS = 300;

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

// MOD keeps blocks that cross midnight (23:00 → 07:00) positive.
const SCHEDULE_DURATION_F =
  '=IF(AND(ISNUMBER(RC2),ISNUMBER(RC3)),MOD(RC3-RC2,1),"")';

/** 'HH:MM' → fraction of a day, or null when not a valid time. */
function parseTime_(text) {
  const m = HHMM.exec(String(text || "").trim());
  return m ? (Number(m[1]) * 60 + Number(m[2])) / 1440 : null;
}

/** Schedule rows to write: the kept sheet data, else the config (v2.6 rows are migrated). */
function scheduleRows_(state) {
  if (!state || !Array.isArray(state.schedule))
    return cfg_().schedule.map(scheduleBlock_);
  // Sheet rows keep their days as typed (even blank); only v2.6 rows get «all».
  return state.schedule.map((b) =>
    Array.isArray(b)
      ? scheduleBlock_(b)
      : Object.assign(scheduleBlock_(b), {
          days: b.days === undefined ? "all" : b.days,
        }),
  );
}

/** Blocks from the sheet that the config accepts (partial rows stay on the sheet only). */
function validScheduleBlocks_(rows) {
  return rows
    .map(scheduleBlock_)
    .map((b) => Object.assign({}, b, { xp: Number(b.xp) || 0 }))
    .filter(
      (b) =>
        parseTime_(b.start) !== null &&
        parseTime_(b.end) !== null &&
        typeof b.activity === "string" &&
        b.activity.trim() &&
        (DAYSETS[b.days] || isRealDate_(b.days)) &&
        b.xp >= 0 &&
        b.xp <= 1000,
    )
    .map((b) => ({
      days: b.days,
      start: b.start,
      end: b.end,
      activity: b.activity,
      xp: b.xp,
      notes: String(b.notes || ""),
    }))
    .slice(0, MAX_SCHEDULE_BLOCKS);
}

/** '17.10.2026', '17/10/2026' or '2026-10-17' typed as text → ISO date; '' otherwise. */
function isoFromDateText_(text) {
  const t = String(text || "").trim();
  if (isRealDate_(t)) return t;
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(t);
  if (!m) return "";
  const iso =
    m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
  return isRealDate_(iso) ? iso : "";
}

/** Day-set label (current language or English) → key; '' when unknown. */
function dayKeyFromLabel_(label) {
  const text = String(label || "").trim();
  return (
    Object.keys(DAYSETS).filter(
      (k) => dayLabel_(k) === text || STRINGS_EN["days." + k] === text,
    )[0] || ""
  );
}

function buildSchedule_(sh, state) {
  const S = SCHEDULE;
  const src = scheduleRows_(state);
  const total = Math.max(S.ROWS, src.length + 20);
  const last = total + 1;
  const keys = Object.keys(DAYSETS);
  trimSheet_(sh, last, S.LOOKUP + 7);

  sh.getRange(1, 1, 1, S.COLS).setValues([
    [
      t_("schedule.days"),
      t_("schedule.start"),
      t_("schedule.end"),
      t_("schedule.activity"),
      t_("schedule.xp"),
      t_("schedule.duration"),
      t_("schedule.notes"),
    ],
  ]);

  writeScheduleRows_(sh, src, total);

  // Day-set lookup: label → Monday…Sunday flags (the helpers read it by label).
  sh.getRange(1, S.LOOKUP, keys.length + 1, 8).setValues(
    [[t_("schedule.days")].concat(t_("weekdays"))].concat(
      keys.map((k) => [dayLabel_(k)].concat(DAYSETS[k])),
    ),
  );
  writeScheduleFormulas_(sh, total);

  const dv = SpreadsheetApp.newDataValidation;
  sh.getRange(2, S.DAYS, total, 1).setDataValidation(
    dv()
      .requireValueInList(keys.map(dayLabel_), true)
      .setAllowInvalid(true)
      .setHelpText(t_("schedule.daysHelp"))
      .build(),
  );
  sh.getRange(2, S.START, total, 2).setDataValidation(
    dv()
      .requireNumberBetween(0, 0.99999)
      .setAllowInvalid(false)
      .setHelpText(t_("schedule.timeHelp"))
      .build(),
  );
  sh.getRange(2, S.ACT, total, 1).setDataValidation(
    dv()
      .requireValueInRange(
        sheet_(names_().cfg).getRange(2, SETTINGS_COL.activities, S.ROWS, 1),
        true,
      )
      .setAllowInvalid(true)
      .setHelpText(t_("schedule.activityHelp"))
      .build(),
  );
  sh.getRange(2, S.XP, total, 1).setDataValidation(
    dv()
      .requireNumberBetween(0, 1000)
      .setAllowInvalid(false)
      .setHelpText(t_("schedule.xpHelp"))
      .build(),
  );
  sh.getRange(2, S.DAYS, total, 1).setNumberFormat(t_("fmt.date"));
  sh.getRange(2, S.START, total, 2).setNumberFormat("hh:mm");
  sh.getRange(2, S.DUR, total, 1).setNumberFormat("[h]:mm");

  buildScheduleToday_(sh, last);
}

/** Writes blocks into A:G (rows below them are cleared); XP 0 shows as an empty cell. */
function writeScheduleRows_(sh, src, total) {
  const S = SCHEDULE;
  const time = (v) => {
    const f = parseTime_(v);
    return f === null ? "" : f;
  };
  const days = (d) =>
    DAYSETS[d] ? dayLabel_(d) : isRealDate_(d) ? U.dateF(d) : asText_(d);
  const grid = src.map((b) => [
    days(b.days),
    time(b.start),
    time(b.end),
    asText_(b.activity),
    Number(b.xp) > 0 ? Number(b.xp) : "",
  ]);
  while (grid.length < total) grid.push(["", "", "", "", ""]);
  sh.getRange(2, 1, total, S.XP).setValues(grid);
  const notes = src.map((b) => [asText_(b.notes)]);
  while (notes.length < total) notes.push([""]);
  sh.getRange(2, S.NOTES, total, 1).setValues(notes);
}

/** Duration and helper columns (relative R1C1, rewritten after every sort). */
function writeScheduleFormulas_(sh, total) {
  const S = SCHEDULE;
  const last = total + 1;
  const nKeys = Object.keys(DAYSETS).length;
  const abs = (col) => "R2C" + col + ":R" + last + "C" + col;
  const labels = "R2C" + S.LOOKUP + ":R" + (nKeys + 1) + "C" + S.LOOKUP;
  const flags =
    "R2C" + (S.LOOKUP + 1) + ":R" + (nKeys + 1) + "C" + (S.LOOKUP + 7);
  const now = "MOD(NOW(),1)";
  const template =
    "IFERROR(INDEX(" +
    flags +
    ",MATCH(RC1," +
    labels +
    ",0),WEEKDAY(TODAY(),2)),0)";
  // Half a minute of tolerance: time fractions compared as text lose their last digit.
  const hiddenByOneOff =
    "COUNTIFS(" +
    abs(1) +
    ",TODAY()," +
    abs(2) +
    ',"<"&(RC3-1/2880),' +
    abs(3) +
    ',">"&(RC2+1/2880))';
  const yesterday =
    "IF(ISNUMBER(RC1),IF(INT(RC1)=TODAY()-1,1,0),IFERROR(INDEX(" +
    flags +
    ",MATCH(RC1," +
    labels +
    ",0),WEEKDAY(TODAY()-1,2)),0))";

  const routine = tracker_("routine");
  let status = '""';
  if (routine) {
    const q = U.q(routine.sheet);
    const w = trackCols_(routine).width;
    status =
      'IF(RC24="","",IFERROR(IF(INDEX(' +
      q +
      "!C1:C" +
      w +
      ",MATCH(TODAY()," +
      q +
      "!C1,0),MATCH(RC24," +
      q +
      "!R1C1:R1C" +
      w +
      ',0))=TRUE,"✅","⬜"),""))';
  }

  const helpers = [
    // T: is the block on today's plan?
    '=IF(OR(RC2="",RC4=""),0,IF(ISNUMBER(RC1),IF(INT(RC1)=TODAY(),1,0),IF(AND(' +
      template +
      "=1," +
      hiddenByOneOff +
      "=0),1,0)))",
    // U: is it running now? A block crossing midnight runs from today's start, or until its
    // end if it started yesterday.
    '=IF(OR(NOT(ISNUMBER(RC2)),NOT(ISNUMBER(RC3)),RC4=""),FALSE,IF(RC3>RC2,AND(RC20=1,' +
      now +
      ">=RC2," +
      now +
      "<RC3),OR(AND(RC20=1," +
      now +
      ">=RC2),AND(" +
      yesterday +
      "=1," +
      now +
      "<RC3))))",
    // V: routine status for today
    "=" + status,
    // W: planned hours per week (one-off blocks excluded)
    "=IF(OR(ISNUMBER(RC1),NOT(ISNUMBER(RC2)),NOT(ISNUMBER(RC3))),0,MOD(RC3-RC2,1)*24*" +
      "IFERROR(SUMPRODUCT(INDEX(" +
      flags +
      ",MATCH(RC1," +
      labels +
      ",0),0)),0))",
    // X: routine item name, «HH:MM activity», plus « · days» when repeated (see routineItems_)
    '=IF(AND(N(RC5)>0,NOT(ISNUMBER(RC1)),ISNUMBER(RC2),RC4<>""),TEXT(RC2,"hh:mm")&" "&TRIM(RC4)&' +
      "IF(COUNTIFS(" +
      abs(2) +
      ",RC2," +
      abs(4) +
      ",RC4," +
      abs(5) +
      ',">0",' +
      abs(25) +
      ',"<100000")>1," · "&RC1,""),"")',
    // Y: sort order: day sets in drop-down order, then one-off dates
    "=IF(ISNUMBER(RC1),100000+RC1,IFERROR(MATCH(RC1," + labels + ",0),0))",
  ];
  sh.getRange(2, S.DUR, total, 1).setFormulasR1C1(
    U.fill(total, 1, SCHEDULE_DURATION_F),
  );
  sh.getRange(2, S.HELP, total, helpers.length).setFormulasR1C1(
    U.fill(total, 1, null).map(() => helpers.slice()),
  );
}

/** «Today» list (I:L) and the summary (N:O): planned hours, progress, now and next. */
function buildScheduleToday_(sh, last) {
  const S = SCHEDULE;
  const L = U.col;
  const col = (c) => L(c) + "2:" + L(c) + last;
  const tFirst = 3,
    tLast = tFirst + S.TODAY_ROWS - 1;
  const tCol = (c) => L(c) + tFirst + ":" + L(c) + tLast;
  const set = (a1, v) => {
    const rg = sh.getRange(a1);
    if (String(v).charAt(0) === "=") rg.setFormula(v);
    else rg.setValue(v);
  };

  set(
    L(S.TODAY) + "1",
    "=" +
      tq_("schedule.today") +
      '&" · "&CHOOSE(WEEKDAY(TODAY(),2),' +
      quoteList_(t_("weekdays")) +
      ')&" "&TEXT(TODAY(),' +
      tq_("fmt.dayMonth") +
      ")",
  );
  sh.getRange(2, S.TODAY, 1, 4).setValues([
    [
      t_("schedule.start"),
      t_("schedule.end"),
      t_("schedule.activity"),
      t_("schedule.status"),
    ],
  ]);
  set(
    L(S.TODAY) + tFirst,
    "=IFERROR(SORT(FILTER({" +
      [S.START, S.END, S.ACT, S.HELP + 2].map(col).join(",") +
      "}," +
      col(S.HELP) +
      '=1),1,TRUE),"")',
  );

  const routine = tracker_("routine");
  let progress = '"—"';
  if (routine) {
    const q = U.q(routine.sheet);
    const c = trackCols_(routine);
    const day = "MATCH(TODAY()," + q + "!A:A,0)";
    const items =
      "INDEX(" + q + "!" + L(c.first) + ":" + L(c.last) + "," + day + ",0)";
    progress =
      "IFERROR(COUNTIF(" +
      items +
      ',TRUE)&" / "&(COUNTIF(' +
      items +
      ",TRUE)+COUNTIF(" +
      items +
      ',FALSE))&" · +"&INDEX(' +
      q +
      "!" +
      L(c.xp) +
      ":" +
      L(c.xp) +
      "," +
      day +
      ')&" XP","—")';
  }
  const rows = [
    [t_("schedule.total"), "=SUM(" + col(S.HELP + 3) + ")"],
    [t_("schedule.blocks"), "=COUNTA(" + col(S.ACT) + ")"],
    [t_("schedule.progress"), "=" + progress],
    [
      t_("schedule.now"),
      "=IFERROR(INDEX(FILTER(" +
        col(S.ACT) +
        "," +
        col(S.HELP + 1) +
        '=TRUE),1),"—")',
    ],
    [
      t_("schedule.next"),
      "=IFERROR(INDEX(FILTER(ARRAYFORMULA(TEXT(" +
        tCol(S.TODAY) +
        ',"hh:mm")&" "&' +
        tCol(S.TODAY + 2) +
        "),ISNUMBER(" +
        tCol(S.TODAY) +
        ")," +
        tCol(S.TODAY) +
        '>MOD(NOW(),1)),1),"—")',
    ],
  ];
  rows.forEach(([label, f], i) => {
    set(L(S.SUM) + (i + 1), label);
    set(L(S.SUM + 1) + (i + 1), f);
  });
  sh.getRange(1, S.SUM + 1).setNumberFormat(t_("fmt.hours"));
  sh.getRange(tFirst, S.TODAY, S.TODAY_ROWS, 2).setNumberFormat("hh:mm");
  set(L(S.SUM) + "7", t_("schedule.hint"));
}

/**
 * Schedule blocks as the owner sees them: { days, start, end, activity, xp, notes }; days as a
 * key or an ISO date. Reads the v2.6 layout too. Empty rows are skipped.
 */
function readSchedule_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  const n = sh.getLastRow() - 1;
  const width = Math.min(SCHEDULE.COLS, sh.getMaxColumns());
  const header = sh.getRange(1, 1, 1, width).getDisplayValues()[0];
  const shown = sh.getRange(2, 1, n, width).getDisplayValues();
  const raw = sh.getRange(2, 1, n, width).getValues();
  const pick = (r) => r.map((v) => String(v).trim());
  // A time cell holds a day fraction whatever its display format (7:30 PM, 07:30:00 …).
  const time = (value, text) =>
    typeof value === "number" && value >= 0 && value < 1
      ? timeText_(value)
      : text;
  const used = (b, daysText) =>
    daysText || b.start || b.end || b.activity || b.xp || b.notes;

  if (header[0] === t_("schedule.start")) {
    return shown
      .map(pick)
      .map((r, i) => ({
        days: "all",
        start: time(raw[i][0], r[0]),
        end: time(raw[i][1], r[1]),
        activity: r[2],
        xp: 0,
        notes: r[4] || "",
      }))
      .filter((b) => used(b, ""));
  }
  return shown
    .map(pick)
    .map((r, i) => {
      const daysText = r[0];
      // Unrecognised day text is kept as typed (and stays out of the config), never «all».
      const days =
        raw[i][0] instanceof Date
          ? U.isoOrEmpty(raw[i][0])
          : dayKeyFromLabel_(daysText) ||
            isoFromDateText_(daysText) ||
            daysText;
      const b = {
        days,
        start: time(raw[i][1], r[1]),
        end: time(raw[i][2], r[2]),
        activity: r[3],
        xp: Number(r[4]) || 0,
        notes: r[6] || "",
      };
      return used(b, daysText) ? b : null;
    })
    .filter((b) => b);
}

/** Menu: orders blocks by day set (drop-down order, then one-off dates) and start time. */
function menuSortSchedule() {
  run_(t_("op.sortSchedule"), () => {
    const sh = sheet_(names_().schedule);
    if (!sh || sh.getLastRow() < 2) {
      alert_(t_("msg.notBuilt"));
      return;
    }
    const total = sh.getMaxRows() - 1;
    if (!buildIncomplete_()) writeBackup_(exportState_());
    // Sorted in code and written back to A:G only: a range sort would also move the Today
    // list and the summary that share these rows. Unknown day text goes last.
    const order = (b) =>
      DAYSETS[b.days]
        ? Object.keys(DAYSETS).indexOf(b.days)
        : isRealDate_(b.days)
          ? 100 + Number(b.days.replace(/-/g, ""))
          : 1e9;
    const start = (b) => {
      const f = parseTime_(b.start);
      return f === null ? 2 : f;
    };
    const blocks = readSchedule_(sh).sort(
      (a, b) => order(a) - order(b) || start(a) - start(b),
    );
    writeScheduleRows_(sh, blocks, total);
    writeScheduleFormulas_(sh, total);
    logEvent_("schedule-sort", { sheet: sh.getName() });
    notify_(t_("msg.scheduleSorted"));
  });
}
