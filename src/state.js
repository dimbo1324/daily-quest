/**
 * User data snapshot, backup and restore. A snapshot is independent of the sheet layout so a
 * rebuild (new version, new habits, new language) can carry ticks, tasks and purchases over.
 * Ticks are matched by date and habit name: renaming a habit drops its old ticks.
 */

/** Snapshot of all user data (tolerant of v1 sheets). */
function exportState_() {
  const SH = names_();
  const state = {
    version: VERSION, exportedAt: new Date().toISOString(),
    firstDate: '', habits: {}, xp: {}, params: null, tasks: [], shop: [],
  };

  const h = sheet_(SH.habits);
  if (h && h.getLastRow() >= LAYOUT.FIRST_ROW) {
    const lastCol = h.getLastColumn();
    const header = h.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    let end = header.indexOf(t_('habits.xp'));
    if (end < 0) end = header.indexOf('XP');
    if (end < 0) end = lastCol;
    const names = header.slice(2, end);
    const rows = h.getLastRow() - LAYOUT.FIRST_ROW + 1;
    const data = h.getRange(LAYOUT.FIRST_ROW, 1, rows, end).getValues();
    // Dates that failed to compute (#ERROR! in v1) are recovered from the first row's formula.
    const firstF = U.isoFromFormula(h.getRange(LAYOUT.FIRST_ROW, 1).getFormula());
    data.forEach((r, i) => {
      const iso = U.isoOrEmpty(r[0]) || (firstF ? U.isoFromParts(U.addDays(U.parts(firstF), i)) : '');
      if (!iso) return;
      if (!state.firstDate || iso < state.firstDate) state.firstDate = iso;
      const done = names.filter((n, j) => r[2 + j] === true);
      if (done.length) state.habits[iso] = done;
    });
  }

  const c = sheet_(SH.cfg);
  if (c && c.getLastRow() >= 2) {
    c.getRange(2, 1, c.getLastRow() - 1, 2).getValues().forEach(([n, x]) => {
      if (n !== '' && x !== '' && Number.isFinite(Number(x))) state.xp[String(n)] = Number(x);
    });
    const p = c.getRange('F2:F4').getValues().map(r => Number(r[0]));
    if (p.every(v => Number.isFinite(v) && v > 0)) state.params = p;
  }

  const t = sheet_(SH.tasks);
  if (t && t.getLastRow() >= 2) {
    const w = Math.min(8, t.getMaxColumns());
    const rg = t.getRange(2, 1, t.getLastRow() - 1, w);
    const fs = rg.getFormulas();
    rg.getValues().forEach((r, i) => {
      if (!String(r[1]).trim()) return;
      const dl = U.isoOrEmpty(r[3]) || U.isoFromFormula(fs[i][3]);
      const dn = w >= 8 ? (U.isoOrEmpty(r[7]) || U.isoFromFormula(fs[i][7])) : '';
      state.tasks.push([r[0] === true, String(r[1]), String(r[2] || ''), dl,
        String(r[4] || ''), Number(r[5]) || 0, String(r[6] || ''), dn]);
    });
  }

  const s = sheet_(SH.shop);
  if (s && s.getLastRow() >= 2) {
    const w = Math.min(4, s.getMaxColumns());
    const rg = s.getRange(2, 1, s.getLastRow() - 1, w);
    const fs = rg.getFormulas();
    rg.getValues().forEach((r, i) => {
      if (!String(r[0]).trim()) return;
      state.shop.push([String(r[0]), Number(r[1]) || 0, r[2] === true,
        w >= 4 ? (U.isoOrEmpty(r[3]) || U.isoFromFormula(fs[i][3])) : '']);
    });
  }
  return state;
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
  for (let i = 0; i < json.length; i += LAYOUT.BACKUP_CHUNK) chunks.push(["'" + json.slice(i, i + LAYOUT.BACKUP_CHUNK)]);
  if (sh.getMaxRows() < chunks.length + 1) sh.insertRowsAfter(sh.getMaxRows(), chunks.length + 1 - sh.getMaxRows());
  sh.getRange(1, 1, chunks.length + 1, 1).setNumberFormat('@');
  sh.getRange(1, 1, 1, 3).setValues([[t_('backup.banner'), state.exportedAt, VERSION]]);
  sh.getRange(2, 1, chunks.length, 1).setValues(chunks);
  if (!sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) {
    sh.protect().setDescription('DQ: ' + t_('protect.backup')).setWarningOnly(true);
  }
  if (ss.getSheets().filter(x => !x.isSheetHidden()).length > 1) sh.hideSheet();
  PropertiesService.getDocumentProperties().setProperty('dq_last_backup', new Date().toISOString());
}

function readBackup_() {
  const sh = sheet_(names_().backup);
  if (!sh || sh.getLastRow() < 2) return null;
  const json = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])).join('');
  try {
    const st = JSON.parse(json);
    return (st && typeof st === 'object' && st.habits) ? st : null;
  } catch (e) {
    console.error('backup parse', e);
    return null;
  }
}

function restoreHabits_(sh, state) {
  const c = habitCols_();
  const rows = sh.getLastRow() - LAYOUT.FIRST_ROW + 1;
  if (rows < 1) return;
  const names = cfg_().habits.map(h => h.name);
  const dates = sh.getRange(LAYOUT.FIRST_ROW, 1, rows, 1).getValues();
  const block = sh.getRange(LAYOUT.FIRST_ROW, c.first, rows, c.n);
  const vals = block.getValues();
  let changed = 0, lost = 0;
  dates.forEach((d, i) => {
    const list = state.habits[U.isoOrEmpty(d[0])];
    if (!list) return;
    list.forEach(nm => {
      const j = names.indexOf(nm);
      if (j >= 0 && vals[i][j] === false) { vals[i][j] = true; changed++; } else if (j < 0) lost++;
    });
  });
  if (changed) block.setValues(vals);
  if (lost) notify_(t_('msg.lostTicks', lost), 10);
}

/** Last date on the Habits sheet (falls back to the first row's formula). */
function lastDateIso_(sh) {
  const last = sh.getLastRow();
  if (last < LAYOUT.FIRST_ROW) return '';
  const direct = U.isoOrEmpty(sh.getRange(last, 1).getValue());
  if (direct) return direct;
  const first = U.isoFromFormula(sh.getRange(LAYOUT.FIRST_ROW, 1).getFormula());
  if (!first) return '';
  return U.isoFromParts(U.addDays(U.parts(first), last - LAYOUT.FIRST_ROW));
}

function findDateRow_(sh, iso) {
  const rows = sh.getLastRow() - LAYOUT.FIRST_ROW + 1;
  if (rows < 1) return 0;
  const vals = sh.getRange(LAYOUT.FIRST_ROW, 1, rows, 1).getValues();
  for (let i = 0; i < vals.length; i++) if (U.isoOrEmpty(vals[i][0]) === iso) return LAYOUT.FIRST_ROW + i;
  return 0;
}
