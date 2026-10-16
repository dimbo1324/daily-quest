/**
 * The Schedule sheet: the owner's daily routine as time blocks — start, end, activity
 * (picked from the activity base on the Settings sheet or typed freely), duration and notes.
 *
 * The sheet holds user data, so rebuilds snapshot it (readSchedule_, display values so times
 * never shift with time-zone history) and write it back. A spreadsheet that has no Schedule
 * sheet yet gets the config's `schedule` once.
 */

const SCHEDULE = {
  ROWS: 100,
  COLS: 5, // start, end, activity, duration, notes
  SUMMARY_COL: 7,
};

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

// MOD keeps blocks that cross midnight (23:00 → 07:00) positive.
const SCHEDULE_DURATION_F =
  '=IF(AND(ISNUMBER(RC1),ISNUMBER(RC2)),MOD(RC2-RC1,1),"")';

/** 'HH:MM' → fraction of a day, or null when not a valid time. */
function parseTime_(text) {
  const m = HHMM.exec(String(text || "").trim());
  return m ? (Number(m[1]) * 60 + Number(m[2])) / 1440 : null;
}

/** Schedule rows to write: from the kept sheet data, else from the config. */
function scheduleRows_(state) {
  if (state && Array.isArray(state.schedule)) return state.schedule;
  return cfg_().schedule.map((b) => [
    b.start,
    b.end,
    b.activity,
    b.notes || "",
  ]);
}

function buildSchedule_(sh, state) {
  const src = scheduleRows_(state);
  const total = Math.max(SCHEDULE.ROWS, src.length + 20);
  const S = SCHEDULE.SUMMARY_COL;
  trimSheet_(sh, total + 1, S + 1);

  sh.getRange(1, 1, 1, SCHEDULE.COLS).setValues([
    [
      t_("schedule.start"),
      t_("schedule.end"),
      t_("schedule.activity"),
      t_("schedule.duration"),
      t_("schedule.notes"),
    ],
  ]);

  const time = (v) => {
    const f = parseTime_(v);
    return f === null ? "" : f;
  };
  if (src.length) {
    sh.getRange(2, 1, src.length, 3).setValues(
      src.map((r) => [time(r[0]), time(r[1]), asText_(r[2])]),
    );
    sh.getRange(2, 5, src.length, 1).setValues(src.map((r) => [asText_(r[3])]));
  }

  sh.getRange(2, 4, total, 1).setFormulasR1C1(
    U.fill(total, 1, SCHEDULE_DURATION_F),
  );

  const dv = SpreadsheetApp.newDataValidation;
  const timeRule = dv()
    .requireNumberBetween(0, 0.99999)
    .setAllowInvalid(false)
    .setHelpText(t_("schedule.timeHelp"))
    .build();
  sh.getRange(2, 1, total, 2).setDataValidation(timeRule);
  const activities = sheet_(names_().cfg).getRange(
    2,
    SETTINGS_COL.activities,
    SCHEDULE.ROWS,
    1,
  );
  sh.getRange(2, 3, total, 1).setDataValidation(
    dv()
      .requireValueInRange(activities, true)
      .setAllowInvalid(true)
      .setHelpText(t_("schedule.activityHelp"))
      .build(),
  );
  sh.getRange(2, 1, total, 2).setNumberFormat("hh:mm");
  sh.getRange(2, 4, total, 1).setNumberFormat("[h]:mm");

  sh.getRange(1, S, 2, 2).setValues([
    [t_("schedule.total"), "=SUM(D2:D)"],
    [t_("schedule.blocks"), "=COUNTA(C2:C)"],
  ]);
  sh.getRange(1, S + 1).setNumberFormat("[h]:mm");
  sh.getRange(4, S).setValue(t_("schedule.hint"));
}

/** Non-empty schedule rows as [start, end, activity, notes] text, as the owner sees them. */
function readSchedule_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  const shown = sh
    .getRange(2, 1, sh.getLastRow() - 1, SCHEDULE.COLS)
    .getDisplayValues();
  return shown
    .map((r) => [r[0], r[1], r[2], r[4]].map((v) => String(v).trim()))
    .filter((r) => r.some((v) => v !== ""));
}

function styleSchedule_(sh) {
  baseStyle_(sh);
  const rows = sh.getMaxRows() - 1;
  const S = SCHEDULE.SUMMARY_COL;
  headerStyle_(sh.getRange(1, 1, 1, SCHEDULE.COLS));
  const data = sh.getRange(2, 1, rows, SCHEDULE.COLS);
  gridLines_(data);
  sh.getRange(2, 1, rows, 2)
    .setHorizontalAlignment("center")
    .setFontColor(TH.accent);
  sh.getRange(2, 3, rows, 1).setFontColor(TH.text);
  sh.getRange(2, 4, rows, 1)
    .setHorizontalAlignment("center")
    .setFontColor(TH.muted);
  sh.getRange(2, 5, rows, 1).setFontColor(TH.muted).setWrap(true);
  [70, 70, 280, 90, 380, 24, 150, 90].forEach((w, i) =>
    sh.setColumnWidth(i + 1, w),
  );
  sh.setRowHeight(1, 34);
  sh.setRowHeights(2, rows, 26);
  sh.setFrozenRows(1);

  sh.getRange(1, S, 2, 2)
    .setBackground(TH.surface)
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      true,
      TH.border,
      SpreadsheetApp.BorderStyle.SOLID,
    );
  sh.getRange(1, S, 2, 1).setFontColor(TH.muted);
  sh.getRange(1, S + 1, 2, 1)
    .setFontColor(TH.accent)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  sh.getRange(4, S, 10, 2)
    .merge()
    .setWrap(true)
    .setFontColor(TH.dim)
    .setFontStyle("italic")
    .setVerticalAlignment("top");

  // The current block uses the time of day; a block crossing midnight is "now" on both sides.
  const now = "MOD(NOW(),1)";
  const current =
    "=AND(ISNUMBER($A2),ISNUMBER($B2),IF($B2>$A2,AND(" +
    now +
    ">=$A2," +
    now +
    "<$B2),OR(" +
    now +
    ">=$A2," +
    now +
    "<$B2)))";
  const overlap =
    "=AND(ISNUMBER($A3),ISNUMBER($A2),ISNUMBER($B2),$B2>$A2,$A3<$B2)";
  sh.setConditionalFormatRules([
    cf_()
      .whenFormulaSatisfied(current)
      .setBackground(TH.accentBg)
      .setBold(true)
      .setRanges([data])
      .build(),
    cf_()
      .whenFormulaSatisfied(overlap)
      .setBackground(TH.redBg)
      .setFontColor("#fecaca")
      .setRanges([sh.getRange(3, 1, rows - 1, SCHEDULE.COLS)])
      .build(),
    cf_()
      .whenFormulaSatisfied("=ISEVEN(ROW())")
      .setBackground(TH.zebra)
      .setRanges([data])
      .build(),
  ]);
}

/** Menu: orders the day by start time; empty rows sink to the bottom. */
function menuSortSchedule() {
  run_(t_("op.sortSchedule"), () => {
    const sh = sheet_(names_().schedule);
    if (!sh || sh.getLastRow() < 2) {
      alert_(t_("msg.notBuilt"));
      return;
    }
    const rows = sh.getMaxRows() - 1;
    sh.getRange(2, 1, rows, SCHEDULE.COLS).sort({ column: 1, ascending: true });
    sh.getRange(2, 4, rows, 1).setFormulasR1C1(
      U.fill(rows, 1, SCHEDULE_DURATION_F),
    );
    logEvent_("schedule-sort", { sheet: sh.getName() });
    notify_(t_("msg.scheduleSorted"));
  });
}
