/**
 * Getting configuration in and out of the spreadsheet: the Settings sheet tables (read back on
 * rebuild), JSON import and export dialogs, and resetting to the demo defaults.
 */

/** Reads the habit and rule tables of the Settings sheet (when present) into the stored config. */
function applySettingsSheet_() {
  const SH = names_();
  const sh = sheet_(SH.cfg);
  if (!sh || sh.getLastRow() < 2) return;
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

  const cfg = cfg_();
  const habits = readTable(SETTINGS_COL.habits, false);
  if (habits.length) cfg.habits = habits;
  if (sh.getMaxColumns() >= SETTINGS_COL.rules + 3) {
    const rules = readTable(SETTINGS_COL.rules, true);
    if (rules.length) cfg.rules = rules;
  }
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
  try {
    applySettingsSheet_();
  } catch (e) {
    alert_(e.message);
    return;
  }
  const exported = JSON.stringify(exportableCfg_(), null, 2);
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

  // State is read with the sheet names of the current config, before the new one applies.
  const state = trackerExists_() ? exportState_() : null;
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) throw new Error(t_("op.busy"));
  try {
    if (state) writeBackup_(state);
    setCfg_(next);
    saveCfg_();
    buildAll_(state);
    logEvent_("config-import", {
      details: "keys: " + Object.keys(user).join(", ") + "\n\n" + text,
    });
  } catch (e) {
    setCfg_(prev);
    logEvent_("config-import-failed", { details: e.message + "\n\n" + text });
    throw e;
  } finally {
    lock.releaseLock();
  }
  return t_("msg.configApplied");
}

function menuResetConfig() {
  if (confirm_(t_("msg.confirmResetConfig")) !== true) return;
  run_(t_("op.resetConfig"), () => {
    const state = trackerExists_() ? exportState_() : null;
    if (state) writeBackup_(state);
    clearStoredCfg_();
    setCfg_(loadCfg_());
    buildAll_(state);
    logEvent_("config-reset", { details: "defaults restored" });
    notify_(t_("msg.configReset"), 8);
  });
}
