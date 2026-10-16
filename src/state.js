/**
 * User data snapshot, backup and restore. A snapshot is independent of the sheet layout so a
 * rebuild (new version, new habits, new language) can carry ticks, tasks and purchases over.
 * Ticks are matched by date and item name (habits and rules): renaming an item drops its old
 * ticks.
 */

/** Snapshot of all user data (tolerant of v1 sheets). */
function exportState_() {
  const SH = names_();
  const state = {
    version: VERSION,
    exportedAt: new Date().toISOString(),
    firstDate: "",
    habits: {},
    rules: {},
    routine: {},
    xp: {},
    ruleXp: {},
    params: null,
    tasks: [],
    shop: [],
  };

  [
    ["habits", SH.habits],
    ["rules", SH.rules],
    ["routine", SH.routine],
  ].forEach(([key, name]) => {
    const ticks = readTicks_(sheet_(name));
    state[key] = ticks.byDate;
    if (
      ticks.firstDate &&
      (!state.firstDate || ticks.firstDate < state.firstDate)
    )
      state.firstDate = ticks.firstDate;
  });

  const c = sheet_(SH.cfg);
  if (c && c.getLastRow() >= 2) {
    const readXp = (col, into) => {
      if (c.getMaxColumns() < col + 1) return;
      c.getRange(2, col, c.getLastRow() - 1, 2)
        .getValues()
        .forEach(([n, x]) => {
          if (n !== "" && x !== "" && Number.isFinite(Number(x)))
            into[String(n)] = Number(x);
        });
    };
    readXp(SETTINGS_COL.habits, state.xp);
    readXp(SETTINGS_COL.rules, state.ruleXp);
    const p = paramsFromCells_(
      c
        .getRange("F2:F4")
        .getValues()
        .map((r) => r[0]),
    );
    const cfg = cfg_();
    state.params = ["xpPerLevel", "coinsPerXp", "streakThreshold"].map((k) =>
      k in p ? p[k] : cfg[k],
    );
  }

  // Only a spreadsheet that has the sheet carries a schedule; others get the config's.
  const sch = sheet_(SH.schedule);
  if (sch) state.schedule = readSchedule_(sch);

  const t = sheet_(SH.tasks);
  if (t && t.getLastRow() >= 2) {
    const w = Math.min(8, t.getMaxColumns());
    const rg = t.getRange(2, 1, t.getLastRow() - 1, w);
    const fs = rg.getFormulas();
    rg.getValues().forEach((r, i) => {
      if (!String(r[1]).trim()) return;
      const dl = U.isoOrEmpty(r[3]) || U.isoFromFormula(fs[i][3]);
      const dn = w >= 8 ? U.isoOrEmpty(r[7]) || U.isoFromFormula(fs[i][7]) : "";
      state.tasks.push([
        r[0] === true,
        String(r[1]),
        String(r[2] || ""),
        dl,
        String(r[4] || ""),
        r[5] === "" ? "" : Number(r[5]) || 0,
        String(r[6] || ""),
        dn,
      ]);
    });
  }

  const s = sheet_(SH.shop);
  if (s && s.getLastRow() >= 2) {
    const w = Math.min(4, s.getMaxColumns());
    const rg = s.getRange(2, 1, s.getLastRow() - 1, w);
    const fs = rg.getFormulas();
    rg.getValues().forEach((r, i) => {
      if (!String(r[0]).trim()) return;
      state.shop.push([
        String(r[0]),
        Number(r[1]) || 0,
        r[2] === true,
        w >= 4 ? U.isoOrEmpty(r[3]) || U.isoFromFormula(fs[i][3]) : "",
      ]);
    });
  }
  return state;
}

/** Ticks of a tracker sheet: { firstDate, byDate: { iso: [item names] } }. Tolerates v1 sheets. */
function readTicks_(sh) {
  const out = { firstDate: "", byDate: {} };
  if (!sh || sh.getLastRow() < LAYOUT.FIRST_ROW) return out;
  const lastCol = sh.getLastColumn();
  const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  let end = header.indexOf(t_("habits.xp"));
  if (end < 0) end = header.indexOf("XP");
  if (end < 0) end = lastCol;
  const names = header.slice(2, end);
  const rows = sh.getLastRow() - LAYOUT.FIRST_ROW + 1;
  const data = sh.getRange(LAYOUT.FIRST_ROW, 1, rows, end).getValues();
  // Dates that failed to compute (#ERROR! in v1) are recovered from the first row's formula.
  const firstF = U.isoFromFormula(
    sh.getRange(LAYOUT.FIRST_ROW, 1).getFormula(),
  );
  data.forEach((r, i) => {
    const iso =
      U.isoOrEmpty(r[0]) ||
      (firstF ? U.isoFromParts(U.addDays(U.parts(firstF), i)) : "");
    if (!iso) return;
    if (!out.firstDate || iso < out.firstDate) out.firstDate = iso;
    const done = names.filter((n, j) => r[2 + j] === true);
    if (done.length) out.byDate[iso] = done;
  });
  return out;
}

/** Backup into a hidden sheet: JSON split into chunks, stored as text. */
function writeBackup_(state) {
  const ss = ss_();
  const name = names_().backup;
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name, ss.getNumSheets());
  sh.clear();
  const json = JSON.stringify(state);
  const chunks = [];
  for (let i = 0; i < json.length; i += LAYOUT.BACKUP_CHUNK)
    chunks.push(["'" + json.slice(i, i + LAYOUT.BACKUP_CHUNK)]);
  if (sh.getMaxRows() < chunks.length + 1)
    sh.insertRowsAfter(sh.getMaxRows(), chunks.length + 1 - sh.getMaxRows());
  sh.getRange(1, 1, chunks.length + 1, 1).setNumberFormat("@");
  sh.getRange(1, 1, 1, 3).setValues([
    [t_("backup.banner"), state.exportedAt, VERSION],
  ]);
  sh.getRange(2, 1, chunks.length, 1).setValues(chunks);
  if (!sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) {
    sh.protect()
      .setDescription("DQ: " + t_("protect.backup"))
      .setWarningOnly(true);
  }
  if (ss.getSheets().filter((x) => !x.isSheetHidden()).length > 1)
    sh.hideSheet();
  PropertiesService.getDocumentProperties().setProperty(
    "dq_last_backup",
    new Date().toISOString(),
  );
  logEvent_("backup", { details: json.length + " characters" });
}

function readBackup_() {
  const sh = sheet_(names_().backup);
  if (!sh || sh.getLastRow() < 2) return null;
  const json = sh
    .getRange(2, 1, sh.getLastRow() - 1, 1)
    .getValues()
    .map((r) => String(r[0]))
    .join("");
  try {
    const st = JSON.parse(json);
    return st && typeof st === "object" && st.habits ? st : null;
  } catch (e) {
    console.error("backup parse", e);
    return null;
  }
}

/**
 * Column of a kept tick: the item with the same name, else — for names «base · days» that
 * changed because a twin block was added or removed or the language changed — the item with
 * the same base that is planned on that date. -1 when nothing matches.
 */
function itemIndexFor_(name, items, iso) {
  const exact = items.map((h) => h.name).indexOf(name);
  if (exact >= 0) return exact;
  const base = (n) => String(n).split(" · ")[0];
  const wd = U.weekday(U.parts(iso));
  const same = items
    .map((h, i) => ({ h, i }))
    .filter((x) => base(x.h.name) === base(name));
  const planned = same.filter(
    (x) => DAYSETS[x.h.days] && DAYSETS[x.h.days][wd],
  );
  if (planned.length === 1) return planned[0].i;
  return same.length === 1 ? same[0].i : -1;
}

function restoreTicks_(sh, t, state) {
  const ticks = state[t.key] || {};
  const c = trackCols_(t);
  const rows = sh.getLastRow() - LAYOUT.FIRST_ROW + 1;
  if (rows < 1) return;
  const dates = sh.getRange(LAYOUT.FIRST_ROW, 1, rows, 1).getValues();
  const block = sh.getRange(LAYOUT.FIRST_ROW, c.first, rows, c.n);
  const vals = block.getValues();
  let changed = 0,
    lost = 0;
  dates.forEach((d, i) => {
    const iso = U.isoOrEmpty(d[0]);
    const list = ticks[iso];
    if (!list) return;
    list.forEach((nm) => {
      const j = itemIndexFor_(nm, t.items, iso);
      if (j >= 0 && vals[i][j] === false) {
        vals[i][j] = true;
        changed++;
      } else if (j < 0) lost++;
    });
  });
  if (changed) block.setValues(vals);
  if (lost) notify_(t_("msg.lostTicks", lost), 10);
}

/** Last date on the Habits sheet (falls back to the first row's formula). */
function lastDateIso_(sh) {
  const last = sh.getLastRow();
  if (last < LAYOUT.FIRST_ROW) return "";
  const direct = U.isoOrEmpty(sh.getRange(last, 1).getValue());
  if (direct) return direct;
  const first = U.isoFromFormula(sh.getRange(LAYOUT.FIRST_ROW, 1).getFormula());
  if (!first) return "";
  return U.isoFromParts(U.addDays(U.parts(first), last - LAYOUT.FIRST_ROW));
}

function findDateRow_(sh, iso) {
  const rows = sh.getLastRow() - LAYOUT.FIRST_ROW + 1;
  if (rows < 1) return 0;
  const vals = sh.getRange(LAYOUT.FIRST_ROW, 1, rows, 1).getValues();
  for (let i = 0; i < vals.length; i++)
    if (U.isoOrEmpty(vals[i][0]) === iso) return LAYOUT.FIRST_ROW + i;
  return 0;
}

const BUILD_FLAG = "dq_build_incomplete";

/** True while a build runs, and after a build that was interrupted (error or time limit). */
function buildIncomplete_() {
  return (
    PropertiesService.getDocumentProperties().getProperty(BUILD_FLAG) === "1"
  );
}

function setBuildIncomplete_(on) {
  const props = PropertiesService.getDocumentProperties();
  if (on) props.setProperty(BUILD_FLAG, "1");
  else props.deleteProperty(BUILD_FLAG);
}

/**
 * The state to rebuild from: { state, recovered }. Normally a fresh snapshot, which is also
 * written to `_backup`. After an interrupted build the sheets are incomplete, so the backup is
 * the truth: it is returned as is and never overwritten by the broken sheets.
 */
function captureState_() {
  if (buildIncomplete_()) {
    const kept = readBackup_();
    if (kept) {
      logEvent_("rebuild-recovery", {
        details:
          "previous build was interrupted; using the backup of " +
          kept.exportedAt,
      });
      return { state: kept, recovered: true };
    }
  }
  if (!trackerExists_()) return { state: null, recovered: false };
  const state = exportState_();
  writeBackup_(state);
  return { state, recovered: false };
}
