/**
 * Layout constants, the dark theme, date and formula utilities, UI helpers.
 */

const LAYOUT = {
  FIRST_ROW: 3, // first day row on the Habits sheet
  TASK_ROWS: 200,
  SHOP_ROWS: 60,
  MIN_FUTURE_DAYS: 14, // fewer days ahead and onOpen adds 30 more
  BACKUP_CHUNK: 40000, // a cell holds at most 50,000 characters
  TASK_LIST: 8, // tasks listed on the dashboard
};

// Dashboard rows
const D = {
  TITLE: 2,
  SUB: 3,
  C1: 5,
  C2: 10,
  C3: 15, // first rows of the card blocks
  TASKS_H: 19,
  TASKS: 20,
  HAB_H: 29,
  HAB: 30,
  CAT_H: 35, // pie chart data (hidden, columns X:Y)
};

// Muted dark palette
const TH = {
  bg: "#0f1115",
  surface: "#161a22",
  surface2: "#1b202b",
  header: "#1a1f2c",
  grid: "#1d2230",
  border: "#2a3142",
  zebra: "#12151c",
  text: "#e5e7eb",
  muted: "#9ca3af",
  dim: "#6b7280",
  faint: "#475063",
  accent: "#8ea2ff",
  accentBg: "#1d2440",
  green: "#4ade80",
  greenBg: "#0f2a1c",
  greenDeep: "#166534",
  yellow: "#facc15",
  yellowBg: "#2c2610",
  red: "#f87171",
  redBg: "#2f1517",
  redDeep: "#4c1d1d",
  orange: "#fb923c",
  purple: "#c4b5fd",
  inactiveBg: "#111318",
  inactiveFg: "#262b36",
  font: "Roboto",
};

const U = {
  q: (name) => "'" + String(name).replace(/'/g, "''") + "'",
  col(n) {
    let s = "";
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  },
  iso: (d) => Utilities.formatDate(d, cfg_().timezone, "yyyy-MM-dd"),
  isoOrEmpty: (v) =>
    v instanceof Date && !isNaN(v)
      ? Utilities.formatDate(v, cfg_().timezone, "yyyy-MM-dd")
      : "",
  todayParts: () =>
    Utilities.formatDate(new Date(), cfg_().timezone, "yyyy-MM-dd")
      .split("-")
      .map(Number),
  parts: (iso) => String(iso).split("-").map(Number),
  isoFromParts: (p) =>
    p[0] + "-" + ("0" + p[1]).slice(-2) + "-" + ("0" + p[2]).slice(-2),
  addDays(p, n) {
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
  },
  diffDays: (a, b) =>
    Math.round(
      (Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 864e5,
    ),
  weekday: (p) =>
    (new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay() + 6) % 7, // 0 = Monday
  dateF(iso) {
    if (!iso || !ISO_DATE.test(iso)) return "";
    const p = U.parts(iso);
    return "=DATE(" + p[0] + "," + p[1] + "," + p[2] + ")";
  },
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  /** '=DATE(2026,10,12)' or '=DATE(2026;10;12)' → '2026-10-12' (recovers broken v1 formulas). */
  isoFromFormula(f) {
    const m =
      /DATE\(\s*(\d{4})\s*[,;]\s*(\d{1,2})\s*[,;]\s*(\d{1,2})\s*\)/i.exec(
        String(f || ""),
      );
    return m
      ? m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2)
      : "";
  },
  fill: (rows, cols, v) =>
    Array.from({ length: rows }, () => Array(cols).fill(v)),
};

/** User text written into a cell: a leading = + - @ must not turn it into a formula. */
function asText_(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function ss_() {
  return SpreadsheetApp.getActive();
}
function sheet_(name) {
  return ss_().getSheetByName(name);
}

function notify_(msg, sec) {
  try {
    ss_().toast(msg, t_("app.title"), sec || 6);
  } catch (e) {
    console.log(msg);
  }
}

function alert_(msg) {
  try {
    SpreadsheetApp.getUi().alert(
      t_("app.title"),
      msg,
      SpreadsheetApp.getUi().ButtonSet.OK,
    );
  } catch (e) {
    console.log(msg);
  }
}

/** true / false is the user's answer; null means no UI (run from the script editor). */
function confirm_(msg) {
  try {
    const ui = SpreadsheetApp.getUi();
    return (
      ui.alert(t_("app.title"), msg, ui.ButtonSet.YES_NO) === ui.Button.YES
    );
  } catch (e) {
    return null;
  }
}

/** Runs an action under the document lock with readable error reporting. */
function run_(label, fn) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) {
    notify_(t_("op.busy"), 8);
    return;
  }
  try {
    return fn();
  } catch (e) {
    console.error(label, e && e.stack ? e.stack : e);
    logEvent_("error", { details: label + ": " + e.message });
    notify_("❌ " + label + ": " + e.message, 15);
    alert_(t_("op.error", label, e.message));
  } finally {
    lock.releaseLock();
  }
}

/** 'AB12' → [12, 28]. */
function a1ToRowCol_(a1) {
  const m = /^([A-Z]+)(\d+)$/.exec(a1);
  if (!m) throw new Error("Bad cell address: " + a1);
  let col = 0;
  for (let i = 0; i < m[1].length; i++)
    col = col * 26 + m[1].charCodeAt(i) - 64;
  return [Number(m[2]), col];
}

/**
 * Writes a sparse { A1: value or formula } map in ONE setValues call over its bounding box
 * (strings starting with "=" become formulas). One call instead of one per cell keeps big
 * builds inside the Apps Script time limit. Cells of the box missing from the map are cleared,
 * so use it on freshly built sheets only.
 */
function writeCells_(sh, cells) {
  const keys = Object.keys(cells);
  if (!keys.length) return;
  const pos = keys.map(a1ToRowCol_);
  const rows = Math.max.apply(
    null,
    pos.map((p) => p[0]),
  );
  const cols = Math.max.apply(
    null,
    pos.map((p) => p[1]),
  );
  const grid = U.fill(rows, cols, "");
  keys.forEach((k, i) => {
    grid[pos[i][0] - 1][pos[i][1] - 1] = cells[k];
  });
  sh.getRange(1, 1, rows, cols).setValues(grid);
}
