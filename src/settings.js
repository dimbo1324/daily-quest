/**
 * Getting configuration in and out of the spreadsheet: the Settings sheet tables (read back on
 * rebuild), JSON import and export dialogs, and resetting to the demo defaults.
 */

/** Reads the habit and rule tables of the Settings sheet (when present) into the stored config. */
/**
 * Habits, rules, activities and game parameters as typed on the Settings sheet, without
 * changing anything; null when there is no sheet. Throws a precise error for a bad row.
 */
function settingsFromSheet_() {
  const SH = names_();
  const sh = sheet_(SH.cfg);
  if (!sh || sh.getLastRow() < 2) return null;
  const byDays = {};
  Object.keys(DAYSETS).forEach((k) => {
    byDays[dayLabel_(k)] = k;
  });
  const byKind = {};
  RULE_KINDS.forEach((k) => {
    byKind[kindLabel_(k)] = k;
  });
  const rows = sh.getLastRow() - 1;

  const readTable = (col, withKind) => {
    const width = withKind ? 4 : 3;
    const vals = sh.getRange(2, col, rows, width).getValues();
    const items = [];
    for (let i = 0; i < vals.length; i++) {
      const name = String(vals[i][0] || "").trim();
      if (!name) continue;
      const xp = Number(vals[i][1]);
      if (!Number.isFinite(xp))
        throw new Error(t_("err.settingsXp", SH.cfg, i + 2));
      const daysCell = String(vals[i][width - 1]).trim();
      const days = byDays[daysCell];
      if (!days)
        throw new Error(t_("err.settingsDays", SH.cfg, i + 2, daysCell));
      if (!withKind) {
        items.push({ name, xp, days });
        continue;
      }
      const kind = byKind[String(vals[i][2]).trim()];
      if (!kind)
        throw new Error(t_("err.settingsKind", SH.cfg, i + 2, vals[i][2]));
      items.push({ name, xp, kind, days });
    }
    return items;
  };

  const out = {
    habits: readTable(SETTINGS_COL.habits, false),
    rules: [],
    activities: [],
  };
  if (sh.getMaxColumns() >= SETTINGS_COL.rules + 3)
    out.rules = readTable(SETTINGS_COL.rules, true);
  if (sh.getMaxColumns() >= SETTINGS_COL.activities) {
    const seen = new Set();
    out.activities = sh
      .getRange(2, SETTINGS_COL.activities, rows, 1)
      .getValues()
      .map((r) => String(r[0]).trim())
      .filter((a) => a && !seen.has(a) && seen.add(a));
  }
  out.params = paramsFromCells_(
    sh
      .getRange("F2:F4")
      .getValues()
      .map((r) => r[0]),
  );
  return out;
}

/** Game parameters from cells F2:F4, each kept only when it is in its allowed range. */
function paramsFromCells_(cells) {
  const limits = [
    ["xpPerLevel", 1, 1e6],
    ["coinsPerXp", 0, 100],
    ["streakThreshold", 0.01, 1],
  ];
  const out = {};
  limits.forEach(([k, lo, hi], i) => {
    const v = cells[i] === "" || cells[i] === null ? NaN : Number(cells[i]);
    if (Number.isFinite(v) && v >= lo && v <= hi) out[k] = v;
  });
  return out;
}

/** Copies the Settings sheet into a config object (non-empty tables only). */
function mergeSettings_(cfg, s) {
  if (!s) return cfg;
  if (s.habits.length) cfg.habits = s.habits;
  if (s.rules.length) cfg.rules = s.rules;
  if (s.activities.length) cfg.activities = s.activities;
  Object.keys(s.params).forEach((k) => {
    cfg[k] = s.params[k];
  });
  return cfg;
}

/** Rebuild: what the owner typed on the Settings sheet becomes the stored config. */
function applySettingsSheet_() {
  const s = settingsFromSheet_();
  if (!s) return;
  mergeSettings_(cfg_(), s);
  saveCfg_();
}

function exportableCfg_() {
  const cfg = cfg_();
  const o = { $schema: "./config.schema.json" };
  CFG_KEYS.forEach((k) => {
    o[k] = clone_(cfg[k]);
  });
  if (!Object.keys(o.strings).length) delete o.strings;
  return o;
}

function showTextDialog_(title, html, w, h) {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html)
      .setWidth(w || 560)
      .setHeight(h || 460),
    title,
  );
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function menuExportConfig() {
  // Read-only: the Settings sheet is merged into the exported copy, never into the stored
  // config (a habit added but not yet rebuilt would misalign «Add 30 days»).
  let exported;
  try {
    exported = JSON.stringify(
      mergeSettings_(exportableCfg_(), settingsFromSheet_()),
      null,
      2,
    );
  } catch (e) {
    alert_(e.message);
    return;
  }
  logEvent_("config-export", { details: exported });
  const json = escapeHtml_(exported);
  showTextDialog_(
    t_("dialog.exportTitle"),
    "<style>body{font:13px Roboto,Arial;margin:12px}textarea{width:100%;height:320px;font:12px monospace;box-sizing:border-box}</style>" +
      "<p>" +
      t_("dialog.exportHint") +
      "</p>" +
      '<textarea readonly onclick="this.select()">' +
      json +
      "</textarea>",
  );
}

function menuImportConfig() {
  const applying = JSON.stringify(t_("dialog.applying"));
  showTextDialog_(
    t_("dialog.importTitle"),
    "<style>body{font:13px Roboto,Arial;margin:12px}textarea{width:100%;height:290px;font:12px monospace;box-sizing:border-box}" +
      "button{margin-top:8px;padding:8px 16px;font-size:14px}#m{margin-left:10px;color:#b00}</style>" +
      "<p>" +
      escapeHtml_(t_("dialog.importHint")) +
      "</p>" +
      '<textarea id="t" placeholder="{ &quot;habits&quot;: [...] }"></textarea><br>' +
      '<button onclick="go()">' +
      escapeHtml_(t_("dialog.importButton")) +
      '</button><span id="m"></span>' +
      '<script>function go(){var m=document.getElementById("m");m.textContent=' +
      applying +
      ";" +
      'google.script.run.withSuccessHandler(function(r){m.style.color="#070";' +
      "m.textContent=r;setTimeout(function(){google.script.host.close()},1500)})" +
      '.withFailureHandler(function(e){m.style.color="#b00";m.textContent=e.message})' +
      '.applyConfigJson(document.getElementById("t").value)}</script>',
    560,
    440,
  );
}

/** Called from the import dialog. Keys present in the JSON replace the current ones. */
function applyConfigJson(text) {
  const fail = (msg) => {
    logEvent_("config-import-failed", { details: msg + "\n\n" + text });
    throw new Error(msg);
  };
  let user;
  try {
    user = JSON.parse(text);
  } catch (e) {
    fail(t_("err.notJson", e.message));
  }
  if (!isPlainObject_(user)) fail(t_("err.notObject"));
  const prev = cfg_();
  const next = normalizeCfg_(user, prev);
  const errs = validateCfg_(next);
  if (errs.length) fail(t_("err.config", errs.join("\n• ")));

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) throw new Error(t_("op.busy"));
  let scheduleKept = false;
  try {
    // State is read with the sheet names of the current config, before the new one applies.
    const { state } = captureState_();
    if (state) scheduleKept = preferImported_(state, user, next);
    setCfg_(next);
    buildAll_(state);
    saveCfg_();
    logEvent_("config-import", {
      details: "keys: " + Object.keys(user).join(", ") + "\n\n" + text,
    });
  } catch (e) {
    // The stored config goes back to the previous one; the next rebuild recovers the data.
    setCfg_(prev);
    saveCfg_();
    logEvent_("config-import-failed", { details: e.message + "\n\n" + text });
    throw e;
  } finally {
    lock.releaseLock();
  }
  return t_(
    scheduleKept ? "msg.configAppliedScheduleKept" : "msg.configApplied",
  );
}

/**
 * Imported keys win over values kept from the sheets (habit and rule XP, game parameters).
 * The Schedule sheet stays the source of the schedule; returns true when an imported schedule
 * was therefore not applied.
 */
function preferImported_(state, user, next) {
  if ("habits" in user) state.xp = {};
  if ("rules" in user) state.ruleXp = {};
  const keys = ["xpPerLevel", "coinsPerXp", "streakThreshold"];
  if (keys.some((k) => k in user)) {
    const kept = state.params || [];
    state.params = keys.map((k, i) =>
      k in user || kept[i] === undefined ? next[k] : kept[i],
    );
  }
  return "schedule" in user && Array.isArray(state.schedule);
}

function menuResetConfig() {
  if (confirm_(t_("msg.confirmResetConfig")) !== true) return;
  run_(t_("op.resetConfig"), () => {
    const { state } = captureState_();
    if (state) {
      state.xp = {};
      state.ruleXp = {};
      state.params = null;
    }
    clearStoredCfg_();
    setCfg_(loadCfg_());
    buildAll_(state);
    logEvent_("config-reset", { details: "defaults restored" });
    notify_(t_("msg.configReset"), 8);
  });
}
