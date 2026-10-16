/**
 * The Logs sheet: an append-only audit log of everything the owner does — every cell edit
 * (with old and new value) and every operation (build, rebuild, import with the imported JSON,
 * export, restore, errors, game outcomes). It exists so that data can be reconstructed by hand
 * if anything goes wrong.
 *
 * The sheet name is fixed and the sheet survives rebuilds, like `_backup`. Event names are
 * stable English identifiers so the log stays searchable whatever the UI language. Logging
 * must never break the action being logged: every failure is caught and written to the
 * execution log instead.
 */

const LOG_SHEET = "Logs";
const LOG_COLS = 7;
const LOG_MAX_TEXT = 45000; // a cell holds at most 50,000 characters

const LOG_ID_PROP = "dq_logs_id";
let logIdCache_ = null;

/** Id of the log sheet, remembered so a renamed log is still found and kept by rebuilds. */
function logSheetId_() {
  if (logIdCache_ === null) {
    logIdCache_ =
      PropertiesService.getDocumentProperties().getProperty(LOG_ID_PROP) || "";
  }
  return logIdCache_;
}

function rememberLogSheet_(sh) {
  logIdCache_ = String(sh.getSheetId());
  PropertiesService.getDocumentProperties().setProperty(
    LOG_ID_PROP,
    logIdCache_,
  );
}

function isLogSheet_(sh) {
  return (
    sh.getName() === LOG_SHEET || String(sh.getSheetId()) === logSheetId_()
  );
}

function logSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(LOG_SHEET);
  if (!sh && logSheetId_()) {
    sh =
      ss
        .getSheets()
        .filter((s) => String(s.getSheetId()) === logSheetId_())[0] || null;
  }
  if (sh) {
    if (String(sh.getSheetId()) !== logSheetId_()) rememberLogSheet_(sh);
    return sh;
  }
  sh = ss.insertSheet(LOG_SHEET, ss.getNumSheets());
  rememberLogSheet_(sh);
  sh.getRange(1, 1, 1, LOG_COLS).setValues([
    [
      t_("logs.time"),
      t_("logs.event"),
      t_("logs.sheet"),
      t_("logs.cell"),
      t_("logs.old"),
      t_("logs.new"),
      t_("logs.details"),
    ],
  ]);
  try {
    styleLogs_(sh);
  } catch (e) {
    console.error("styleLogs_", e && e.stack ? e.stack : e);
  }
  return sh;
}

/** A value as safe log text: never parsed as a formula, never longer than a cell allows. */
function logText_(v) {
  if (v === undefined || v === null) return "";
  let s =
    v instanceof Date
      ? Utilities.formatDate(v, cfg_().timezone, "yyyy-MM-dd HH:mm:ss Z")
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
  if (s.length > LOG_MAX_TEXT)
    s = s.slice(0, LOG_MAX_TEXT) + " …[+" + (s.length - LOG_MAX_TEXT) + "]";
  return asText_(s);
}

function logTime_() {
  return Utilities.formatDate(
    new Date(),
    cfg_().timezone,
    "yyyy-MM-dd HH:mm:ss Z",
  );
}

/** Appends one log row. `info` = { sheet, cell, oldValue, newValue, details }. Never throws. */
function logEvent_(event, info) {
  try {
    const i = info || {};
    logSheet_().appendRow(
      [
        logTime_(),
        event,
        i.sheet,
        i.cell,
        i.oldValue,
        i.newValue,
        i.details,
      ].map(logText_),
    );
  } catch (e) {
    console.error("logEvent_ " + event, e && e.stack ? e.stack : e);
  }
}

/** Logs a user edit from the onEdit event; tracker ticks also name the item and the date. */
function logEdit_(e) {
  try {
    const r = e.range;
    const sh = r.getSheet();
    const name = sh.getName();
    if (name === names_().backup || isLogSheet_(sh)) return;
    const single = r.getNumRows() === 1 && r.getNumColumns() === 1;
    const info = { sheet: name, cell: r.getA1Notation() };
    if (single) {
      info.oldValue = e.oldValue;
      info.newValue = e.value !== undefined ? e.value : r.getValue();
      info.details = editContext_(sh, r);
    } else {
      info.newValue = r.getValues();
      info.details = r.getNumRows() + "×" + r.getNumColumns();
    }
    logEvent_("edit", info);
  } catch (err) {
    console.error("logEdit_", err && err.stack ? err.stack : err);
  }
}

/** "item · date" for a tracker cell, otherwise the column header. */
function editContext_(sh, r) {
  const row = r.getRow(),
    col = r.getColumn();
  const header = String(sh.getRange(1, col).getValue());
  const tracker = trackers_().filter((t) => t.sheet === sh.getName())[0];
  if (tracker && row >= LAYOUT.FIRST_ROW)
    return header + " · " + U.isoOrEmpty(sh.getRange(row, 1).getValue());
  return header;
}

function styleLogs_(sh) {
  baseStyle_(sh);
  headerStyle_(sh.getRange(1, 1, 1, LOG_COLS));
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), LOG_COLS)
    .setFontColor(TH.muted)
    .setFontSize(9)
    .setVerticalAlignment("top")
    .setNumberFormat("@");
  [170, 150, 110, 80, 160, 160, 420].forEach((w, i) =>
    sh.setColumnWidth(i + 1, w),
  );
  sh.setFrozenRows(1);
  sh.setTabColor(TH.dim);
  if (!sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) {
    sh.protect()
      .setDescription("DQ: " + t_("protect.logs"))
      .setWarningOnly(true);
  }
}
