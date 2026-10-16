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
  activities: [
    "Morning routine",
    "Evening routine",
    "Workout",
    "Sport",
    "Meditation",
    "Shower",
    "Breakfast",
    "Lunch",
    "Dinner",
    "Cooking",
    "Work",
    "Study",
    "Reading",
    "Laundry",
    "Cleaning",
    "Shopping",
    "Walk",
    "Commute",
    "Free time",
    "Family time",
    "Plan tomorrow",
    "Sleep",
  ],
  schedule: [
    {
      days: "monfri",
      start: "07:00",
      end: "07:30",
      activity: "Morning routine",
      xp: 10,
      notes: "Wake up, brush teeth, wash, a glass of water",
    },
    {
      days: "monfri",
      start: "07:30",
      end: "08:30",
      activity: "Workout",
      xp: 15,
      notes: "",
    },
    {
      days: "monfri",
      start: "08:30",
      end: "09:00",
      activity: "Breakfast",
      xp: 0,
      notes: "",
    },
    {
      days: "monfri",
      start: "09:00",
      end: "13:00",
      activity: "Work",
      xp: 10,
      notes: "",
    },
    {
      days: "monfri",
      start: "13:00",
      end: "14:00",
      activity: "Lunch",
      xp: 0,
      notes: "",
    },
    {
      days: "monfri",
      start: "14:00",
      end: "18:00",
      activity: "Work",
      xp: 10,
      notes: "",
    },
    {
      days: "monfri",
      start: "19:00",
      end: "20:00",
      activity: "Dinner",
      xp: 0,
      notes: "",
    },
    {
      days: "all",
      start: "21:30",
      end: "22:00",
      activity: "Plan tomorrow",
      xp: 5,
      notes: "",
    },
    {
      days: "all",
      start: "22:00",
      end: "22:30",
      activity: "Evening routine",
      xp: 0,
      notes: "",
    },
    {
      days: "all",
      start: "23:00",
      end: "07:00",
      activity: "Sleep",
      xp: 10,
      notes: "",
    },
    {
      days: "satsun",
      start: "08:30",
      end: "09:00",
      activity: "Morning routine",
      xp: 10,
      notes: "",
    },
    {
      days: "satsun",
      start: "10:00",
      end: "12:00",
      activity: "Sport",
      xp: 15,
      notes: "",
    },
    {
      days: "satsun",
      start: "12:00",
      end: "16:00",
      activity: "Family time",
      xp: 0,
      notes: "",
    },
    {
      days: "sat",
      start: "16:00",
      end: "17:00",
      activity: "Cleaning",
      xp: 5,
      notes: "",
    },
  ],
  schedulePerfectBonus: 20,
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
// Day sets offered in every "days" drop-down, in this order; weeks start on Monday.
const DAYSETS = {
  all: [1, 1, 1, 1, 1, 1, 1],
  monfri: [1, 1, 1, 1, 1, 0, 0],
  monsat: [1, 1, 1, 1, 1, 1, 0],
  satsun: [0, 0, 0, 0, 0, 1, 1],
  mon: [1, 0, 0, 0, 0, 0, 0],
  tue: [0, 1, 0, 0, 0, 0, 0],
  wed: [0, 0, 1, 0, 0, 0, 0],
  thu: [0, 0, 0, 1, 0, 0, 0],
  fri: [0, 0, 0, 0, 1, 0, 0],
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
  cfg.activities = asArray_(cfg.activities);
  cfg.schedule = asArray_(cfg.schedule).map(scheduleBlock_);
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

/**
 * A schedule block in the current shape { days, start, end, activity, xp, notes }. Accepts the
 * v2.6 shapes: objects without days / xp, and snapshot rows [start, end, activity, notes].
 * Valid times are padded to HH:MM so a block's tracker name stays stable.
 */
function scheduleBlock_(b) {
  const o = Array.isArray(b)
    ? { start: b[0], end: b[1], activity: b[2], notes: b[3] }
    : isPlainObject_(b)
      ? Object.assign({}, b)
      : b;
  if (!isPlainObject_(o)) return o;
  if (o.days === undefined || o.days === "") o.days = "all";
  if (o.xp === undefined || o.xp === "") o.xp = 0;
  if (o.notes === undefined) o.notes = "";
  ["start", "end"].forEach((k) => {
    const f = parseTime_(o[k]);
    if (f !== null) o[k] = timeText_(f);
  });
  return o;
}

/** Day fraction → 'HH:MM'. */
function timeText_(f) {
  const mins = Math.round(f * 1440);
  return (
    ("0" + Math.floor(mins / 60)).slice(-2) +
    ":" +
    ("0" + (mins % 60)).slice(-2)
  );
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
