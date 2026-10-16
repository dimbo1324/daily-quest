/**
 * Config validation: every problem as a precise, human-readable line (which entry, which
 * field, what is allowed). Unknown keys and fields are errors so typos never pass silently.
 */

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
    ["schedulePerfectBonus", 0, 1000],
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

  validateSchedule_(cfg, errs);

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
    if (!(Number.isFinite(h.xp) && h.xp >= 0 && h.xp <= 1000))
      errs.push((h.name || id) + ": xp must be 0–1000");
    if (!DAYSETS[h.days])
      errs.push((h.name || id) + ": unknown days «" + h.days + "»");
  });
}

/** Activity base (unique names) and schedule blocks. */
function validateSchedule_(cfg, errs) {
  const acts = cfg.activities;
  if (acts.length > 100) errs.push("Too many activities (100 at most).");
  const seen = new Set();
  acts.forEach((a, i) => {
    if (typeof a !== "string" || !a.trim()) {
      errs.push("Activity #" + (i + 1) + ": must be a non-empty text");
    } else if (seen.has(a)) {
      errs.push("Duplicate activity: " + a);
    }
    seen.add(a);
  });
  if (cfg.schedule.length > MAX_SCHEDULE_BLOCKS)
    errs.push(
      "Too many schedule blocks (" + MAX_SCHEDULE_BLOCKS + " at most).",
    );
  cfg.schedule.forEach((b, i) => {
    const id = "Schedule block #" + (i + 1);
    if (!isPlainObject_(b)) {
      errs.push(id + ": must be an object");
      return;
    }
    unknownFields_(b, [
      "days",
      "start",
      "end",
      "activity",
      "xp",
      "notes",
    ]).forEach((f) => errs.push(id + ": unknown field «" + f + "»"));
    if (!DAYSETS[b.days] && !isRealDate_(b.days)) {
      errs.push(
        id +
          ": days must be one of " +
          Object.keys(DAYSETS).join(", ") +
          " or a date YYYY-MM-DD",
      );
    }
    if (!(typeof b.xp === "number" && b.xp >= 0 && b.xp <= 1000)) {
      errs.push(id + ": xp must be a number 0–1000");
    }
    ["start", "end"].forEach((k) => {
      if (parseTime_(b[k]) === null)
        errs.push(id + ": " + k + " must be a time HH:MM");
    });
    if (typeof b.activity !== "string" || !b.activity.trim()) {
      errs.push(id + ": empty activity");
    }
    if (b.notes !== undefined && typeof b.notes !== "string") {
      errs.push(id + ": notes must be a text");
    }
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
    "sheet.routine",
    "sheet.schedule",
    "sheet.tasks",
    "sheet.shop",
    "sheet.settings",
  ];
  // Google Sheets compares sheet names ignoring case.
  const sheetNames = sheetKeys.map((k) =>
    String(strings[k] || STRINGS_EN[k]).toLowerCase(),
  );
  const reserved = ["_backup", "logs"];
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
