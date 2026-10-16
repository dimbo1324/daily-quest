/**
 * Configuration: defaults, normalization, validation, persistence, import and export.
 *
 * Two tiers:
 *  - DEFAULT_CFG below is the neutral demo config. It must stay identical to
 *    config.example.json (a test enforces it).
 *  - The personal config lives in the spreadsheet's document properties. It is applied with
 *    menu «Import from JSON» from the owner's git-ignored my-config.json.
 *
 * The public format is described by config.schema.json. Legacy tuple entries from config v1
 * ([name, xp, days] and so on) are still accepted and normalized into objects.
 */

const CONFIG_FORMAT = 2;

const DEFAULT_CFG = {
  timezone: "Etc/GMT",
  startDate: "",
  endDate: "",
  daysToCreate: 60,
  xpPerLevel: 500,
  coinsPerXp: 0.1,
  streakThreshold: 0.8,
  categories: ["Work", "Health", "Learning", "Sport", "Home", "Personal"],
  habits: [
    { name: "🧘 Meditation", xp: 10, days: "all" },
    { name: "💪 Workout", xp: 20, days: "monsat" },
    { name: "🚶 10,000 steps", xp: 10, days: "all" },
    { name: "📖 Read 30 min", xp: 10, days: "all" },
    { name: "🗣️ Language practice 30 min", xp: 15, days: "all" },
    { name: "🗓️ Plan the week", xp: 20, days: "sun" },
  ],
  rules: [
    { name: "📵 No phone in bed", xp: 10, kind: "avoid", days: "all" },
    { name: "🚬 No smoking", xp: 15, kind: "avoid", days: "all" },
    { name: "🛏️ Make the bed", xp: 5, kind: "keep", days: "all" },
    { name: "🌳 Fresh air 20 min", xp: 10, kind: "keep", days: "all" },
  ],
  tasks: [
    {
      title: "My first task",
      category: "Personal",
      deadline: "",
      priority: "medium",
      xp: 10,
    },
  ],
  rewards: [
    { name: "☕ Coffee out", price: 30 },
    { name: "🎬 Movie night", price: 40 },
    { name: "🍕 Favorite dinner", price: 50 },
    { name: "🏖️ Day off from the plan", price: 200 },
  ],
  strings: {},
};

const CFG_KEYS = Object.keys(DEFAULT_CFG);
const DAYSETS = {
  all: [1, 1, 1, 1, 1, 1, 1],
  monsat: [1, 1, 1, 1, 1, 1, 0],
  monfri: [1, 1, 1, 1, 1, 0, 0],
  sat: [0, 0, 0, 0, 0, 1, 0],
  sun: [0, 0, 0, 0, 0, 0, 1],
};
const PRIORITY_KEYS = ["high", "medium", "low"];
const RULE_KINDS = ["keep", "avoid"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CALENDAR_DAYS = 1100;

const CFG_PROP = "dq_config";
const CFG_CHUNKS_PROP = "dq_config_chunks";
// Document properties hold at most 9 kB per value; 2800 UTF-16 units stay below it even for
// three-byte characters.
const CFG_CHUNK = 2800;

let cfgCache_ = null;

/** The effective config: defaults overlaid with the stored personal config. */
function cfg_() {
  if (!cfgCache_) cfgCache_ = loadCfg_();
  return cfgCache_;
}

function setCfg_(cfg) {
  cfgCache_ = cfg;
}

function clone_(v) {
  return JSON.parse(JSON.stringify(v));
}

function loadCfg_() {
  try {
    const raw = readStoredCfg_();
    if (raw) return normalizeCfg_(JSON.parse(raw), DEFAULT_CFG);
  } catch (e) {
    console.error("loadCfg_", e);
  }
  return normalizeCfg_({}, DEFAULT_CFG);
}

function readStoredCfg_() {
  const props = PropertiesService.getDocumentProperties();
  const n = Number(props.getProperty(CFG_CHUNKS_PROP));
  if (!n) return props.getProperty(CFG_PROP);
  let s = "";
  for (let i = 0; i < n; i++) s += props.getProperty(CFG_PROP + "_" + i) || "";
  return s;
}

function saveCfg_() {
  const props = PropertiesService.getDocumentProperties();
  const json = JSON.stringify(cfg_());
  const chunks = [];
  for (let i = 0; i < json.length;) {
    let end = Math.min(i + CFG_CHUNK, json.length);
    const code = json.charCodeAt(end - 1);
    if (end < json.length && code >= 0xd800 && code <= 0xdbff) end--;
    chunks.push(json.slice(i, end));
    i = end;
  }
  clearStoredCfg_();
  const values = {};
  chunks.forEach((c, i) => {
    values[CFG_PROP + "_" + i] = c;
  });
  values[CFG_CHUNKS_PROP] = String(chunks.length);
  props.setProperties(values);
}

function clearStoredCfg_() {
  const props = PropertiesService.getDocumentProperties();
  props.getKeys().forEach((k) => {
    if (k === CFG_PROP || k.indexOf(CFG_PROP + "_") === 0)
      props.deleteProperty(k);
  });
}

/**
 * Overlays `user` on `base` key by key and converts legacy tuples into objects.
 * Does not validate: unknown keys and bad values are reported by validateCfg_.
 */
function normalizeCfg_(user, base) {
  const cfg = clone_(base);
  const extra = {};
  Object.keys(user || {}).forEach((k) => {
    if (k === "$schema") return;
    if (CFG_KEYS.indexOf(k) < 0) {
      extra[k] = user[k];
      return;
    }
    if (user[k] !== undefined && user[k] !== null) cfg[k] = clone_(user[k]);
  });
  if (Object.keys(extra).length) cfg.unknownKeys_ = Object.keys(extra);

  const strings = isPlainObject_(cfg.strings) ? cfg.strings : {};
  cfg.habits = asArray_(cfg.habits).map((h) =>
    Array.isArray(h) ? { name: h[0], xp: h[1], days: h[2] } : h,
  );
  cfg.rules = asArray_(cfg.rules);
  cfg.tasks = asArray_(cfg.tasks).map((t) => {
    const o = Array.isArray(t)
      ? {
          title: t[0],
          category: t[1],
          deadline: t[2],
          priority: t[3],
          xp: t[4],
        }
      : t;
    if (o && typeof o === "object")
      o.priority = priorityKey_(o.priority, strings);
    return o;
  });
  cfg.rewards = asArray_(cfg.rewards).map((r) =>
    Array.isArray(r) ? { name: r[0], price: r[1] } : r,
  );
  return cfg;
}

function asArray_(v) {
  return Array.isArray(v) ? v : [];
}
function isPlainObject_(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Accepts a priority key or its label (English or overridden), returns the key when known. */
function priorityKey_(value, strings) {
  if (PRIORITY_KEYS.indexOf(value) >= 0) return value;
  for (let i = 0; i < PRIORITY_KEYS.length; i++) {
    const k = PRIORITY_KEYS[i];
    if (
      value === STRINGS_EN["priority." + k] ||
      value === strings["priority." + k]
    )
      return k;
  }
  return value;
}

function isRealDate_(iso) {
  if (!ISO_DATE.test(String(iso))) return false;
  const p = String(iso).split("-").map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return (
    d.getUTCFullYear() === p[0] &&
    d.getUTCMonth() === p[1] - 1 &&
    d.getUTCDate() === p[2]
  );
}

/** All problems of a normalized config as human-readable lines (empty when valid). */
function validateCfg_(cfg) {
  const errs = [];
  if (cfg.unknownKeys_)
    errs.push("Unknown settings: " + cfg.unknownKeys_.join(", "));
  if (typeof cfg.timezone !== "string" || !cfg.timezone)
    errs.push("timezone must be a non-empty string");

  ["startDate", "endDate"].forEach((k) => {
    if (cfg[k] !== "" && !isRealDate_(cfg[k]))
      errs.push(k + " must be YYYY-MM-DD or empty");
  });
  if (cfg.endDate && !cfg.startDate) errs.push("endDate needs startDate");
  if (isRealDate_(cfg.startDate) && isRealDate_(cfg.endDate)) {
    const span = U.diffDays(U.parts(cfg.startDate), U.parts(cfg.endDate)) + 1;
    if (span < 1) errs.push("endDate must not be before startDate");
    if (span > MAX_CALENDAR_DAYS)
      errs.push("the calendar may span at most " + MAX_CALENDAR_DAYS + " days");
  }
  [
    ["xpPerLevel", 1, 1e6],
    ["coinsPerXp", 0, 100],
    ["streakThreshold", 0.01, 1],
    ["daysToCreate", 7, 400],
  ].forEach(([k, a, b]) => {
    if (!(typeof cfg[k] === "number" && cfg[k] >= a && cfg[k] <= b))
      errs.push(k + " must be a number in " + a + "–" + b);
  });

  const cats = cfg.categories;
  if (
    !Array.isArray(cats) ||
    !cats.length ||
    cats.length > 12 ||
    cats.some((c) => typeof c !== "string" || !c)
  ) {
    errs.push("categories: 1–12 non-empty names");
  }

  if (!cfg.habits.length) errs.push("The habit list is empty.");
  if (cfg.habits.length > 40) errs.push("Too many habits (40 at most).");
  validateTrackItems_(cfg.habits, "Habit", ["name", "xp", "days"], errs);
  if (cfg.rules.length > 30) errs.push("Too many rules (30 at most).");
  validateTrackItems_(cfg.rules, "Rule", ["name", "xp", "kind", "days"], errs);
  cfg.rules.forEach((r, i) => {
    if (isPlainObject_(r) && RULE_KINDS.indexOf(r.kind) < 0) {
      errs.push(
        (r.name || "Rule #" + (i + 1)) +
          ": kind must be one of " +
          RULE_KINDS.join(", "),
      );
    }
  });

  cfg.tasks.forEach((t, i) => {
    const id = "Task #" + (i + 1);
    if (!isPlainObject_(t)) {
      errs.push(id + ": must be an object");
      return;
    }
    unknownFields_(t, [
      "title",
      "category",
      "deadline",
      "priority",
      "xp",
    ]).forEach((f) => errs.push(id + ": unknown field «" + f + "»"));
    if (!t.title || typeof t.title !== "string")
      errs.push(id + ": empty title");
    if (t.deadline && !isRealDate_(t.deadline))
      errs.push(id + ": deadline must be YYYY-MM-DD or empty");
    if (Array.isArray(cats) && cats.indexOf(t.category) < 0)
      errs.push(id + ": unknown category «" + t.category + "»");
    if (PRIORITY_KEYS.indexOf(t.priority) < 0)
      errs.push(id + ": priority must be one of " + PRIORITY_KEYS.join(", "));
    if (!(Number.isFinite(t.xp) && t.xp >= 0 && t.xp <= 500))
      errs.push(id + ": xp must be 0–500");
  });

  cfg.rewards.forEach((r, i) => {
    const id = "Reward #" + (i + 1);
    if (!isPlainObject_(r)) {
      errs.push(id + ": must be an object");
      return;
    }
    unknownFields_(r, ["name", "price"]).forEach((f) =>
      errs.push(id + ": unknown field «" + f + "»"),
    );
    if (!r.name || typeof r.name !== "string") errs.push(id + ": empty name");
    if (!(Number.isFinite(r.price) && r.price > 0))
      errs.push(id + ": price must be > 0");
  });

  validateStrings_(cfg.strings).forEach((e) => errs.push(e));
  return errs;
}

/** Shared checks for day-tracked items (habits, rules): name, XP, days, no unknown fields. */
function validateTrackItems_(items, label, fields, errs) {
  const names = new Set();
  items.forEach((h, i) => {
    const id = label + " #" + (i + 1);
    if (!isPlainObject_(h)) {
      errs.push(id + ": must be an object");
      return;
    }
    unknownFields_(h, fields).forEach((f) =>
      errs.push(id + ": unknown field «" + f + "»"),
    );
    if (!h.name || typeof h.name !== "string") errs.push(id + ": empty name");
    else if (names.has(h.name))
      errs.push("Duplicate " + label.toLowerCase() + ": " + h.name);
    names.add(h.name);
    if (!(Number.isFinite(h.xp) && h.xp > 0 && h.xp <= 1000))
      errs.push((h.name || id) + ": xp must be 1–1000");
    if (!DAYSETS[h.days])
      errs.push((h.name || id) + ": unknown days «" + h.days + "»");
  });
}

function unknownFields_(obj, allowed) {
  return Object.keys(obj).filter((k) => allowed.indexOf(k) < 0);
}

function validateStrings_(strings) {
  if (!isPlainObject_(strings)) return ["strings must be an object"];
  const errs = [];
  Object.keys(strings).forEach((k) => {
    const base = STRINGS_EN[k];
    const v = strings[k];
    if (base === undefined) {
      errs.push("strings: unknown key «" + k + "»");
      return;
    }
    if (Array.isArray(base)) {
      if (!Array.isArray(v) || v.some((x) => typeof x !== "string"))
        errs.push("strings." + k + " must be a list of texts");
      else if (k === "weekdays" && v.length !== 7)
        errs.push("strings.weekdays needs 7 names");
      else if (!v.length) errs.push("strings." + k + " must not be empty");
    } else if (typeof v !== "string" || !v) {
      errs.push("strings." + k + " must be a non-empty text");
    }
  });
  const sheetKeys = [
    "sheet.dashboard",
    "sheet.stats",
    "sheet.habits",
    "sheet.rules",
    "sheet.tasks",
    "sheet.shop",
    "sheet.settings",
  ];
  const sheetNames = sheetKeys.map((k) => strings[k] || STRINGS_EN[k]);
  const reserved = ["_backup", "Logs"];
  if (
    new Set(sheetNames).size !== sheetNames.length ||
    sheetNames.some((n) => reserved.indexOf(n) >= 0)
  ) {
    errs.push(
      "strings: sheet names must be unique and must not be «_backup» or «Logs»",
    );
  }
  return errs;
}

function assertValidCfg_(cfg) {
  const errs = validateCfg_(cfg);
  if (errs.length) throw new Error(t_("err.config", errs.join("\n• ")));
}

/**
 * The calendar period as [start, days]. `todayP` and the result are [y, m, d] parts.
 * Kept data that starts earlier extends the period backwards so no tick is lost.
 */
function calendarPeriod_(cfg, todayP, firstDateIso) {
  const base = cfg.startDate ? U.parts(cfg.startDate) : todayP;
  let start = base;
  if (firstDateIso && U.diffDays(U.parts(firstDateIso), start) > 0)
    start = U.parts(firstDateIso);
  const end = cfg.endDate
    ? U.parts(cfg.endDate)
    : U.addDays(
        U.diffDays(todayP, base) > 0 ? base : todayP,
        cfg.daysToCreate - 1,
      );
  return [start, Math.max(U.diffDays(start, end) + 1, 1)];
}

// ═════════════════════════ Settings sheet, JSON import and export ═════════════════════════

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
