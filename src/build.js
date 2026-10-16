/**
 * Building the sheets. Formulas are written in en_US syntax (R1C1 where rows repeat), which is
 * why buildAll_ forces the spreadsheet locale: in a comma-decimal locale they break with #ERROR!.
 */

function buildAll_(state) {
  const cfg = cfg_();
  assertValidCfg_(cfg);
  const SH = names_();
  const ss = ss_();
  // Once the Schedule sheet exists it is the source: its blocks decide the Routine tracker.
  if (state && Array.isArray(state.schedule)) {
    cfg.schedule = validScheduleBlocks_(state.schedule);
    saveCfg_();
  }
  ss.setSpreadsheetTimeZone(cfg.timezone);
  ss.setSpreadsheetLocale("en_US");
  // «Now / Next» and «Today» depend on the clock; refresh them hourly, not only on edits.
  ss.setRecalculationInterval(SpreadsheetApp.RecalculationInterval.HOUR);
  SpreadsheetApp.flush();

  // Delete everything except the backup.
  const tmp = ss.insertSheet("__tmp_" + Date.now());
  ss.getSheets().forEach((s) => {
    const keep =
      s.getSheetId() === tmp.getSheetId() ||
      s.getName() === SH.backup ||
      s.getName() === LOG_SHEET;
    if (!keep) ss.deleteSheet(s);
  });
  const trackers = trackers_();
  const sheets = {};
  [
    ["dash", SH.dash],
    ["stats", SH.stats],
  ]
    .concat(
      trackers.map((t) => [t.key, t.sheet]),
      [
        ["schedule", SH.schedule],
        ["tasks", SH.tasks],
        ["shop", SH.shop],
        ["cfg", SH.cfg],
      ],
    )
    .forEach(([k, n], i) => {
      sheets[k] = ss.insertSheet(n, i);
    });
  ss.deleteSheet(tmp);

  const [start, days] = calendarPeriod_(
    cfg,
    U.todayParts(),
    state && state.firstDate,
  );

  buildSettings_(sheets.cfg, state);
  trackers.forEach((t) => buildTracker_(sheets[t.key], t, start, days));
  buildSchedule_(sheets.schedule, state);
  buildTasks_(sheets.tasks, state);
  buildShop_(sheets.shop, state);
  buildDashboard_(sheets.dash);
  buildStats_(sheets.stats);
  SpreadsheetApp.flush();

  if (state) trackers.forEach((t) => restoreTicks_(sheets[t.key], t, state));

  styleAll_();
  protectAll_();

  const bk = ss.getSheetByName(SH.backup);
  if (bk && !bk.isSheetHidden()) bk.hideSheet();
  const props = PropertiesService.getDocumentProperties();
  props.setProperty("dq_version", VERSION);
  props.setProperty("dq_built_at", new Date().toISOString());
  ss.setActiveSheet(sheets.dash);
}

function trimSheet_(sh, rows, cols) {
  const mr = sh.getMaxRows(),
    mc = sh.getMaxColumns();
  if (mr > rows) sh.deleteRows(rows + 1, mr - rows);
  else if (mr < rows) sh.insertRowsAfter(mr, rows - mr);
  if (mc > cols) sh.deleteColumns(cols + 1, mc - cols);
  else if (mc < cols) sh.insertColumnsAfter(mc, cols - mc);
}

function ensureRows_(sh, lastRow) {
  const mr = sh.getMaxRows();
  if (mr < lastRow) sh.insertRowsAfter(mr, lastRow - mr);
}

function quoteList_(items) {
  return items.map((s) => '"' + String(s).replace(/"/g, '""') + '"').join(",");
}

// ---------- Settings ----------
function buildSettings_(sh, state) {
  const cfg = cfg_();
  const rows = cfg.habits.map((h) => [
    h.name,
    state && state.xp && state.xp[h.name] != null ? state.xp[h.name] : h.xp,
    dayLabel_(h.days),
  ]);
  const ruleXp = (state && state.ruleXp) || {};
  const ruleRows = cfg.rules.map((r) => [
    r.name,
    ruleXp[r.name] != null ? ruleXp[r.name] : r.xp,
    kindLabel_(r.kind),
    dayLabel_(r.days),
  ]);
  const params =
    state && state.params
      ? state.params
      : [cfg.xpPerLevel, cfg.coinsPerXp, cfg.streakThreshold];
  const help = t_("settings.help");
  const R = SETTINGS_COL.rules;
  const A = SETTINGS_COL.activities;
  trimSheet_(
    sh,
    Math.max(rows.length, ruleRows.length, help.length, SCHEDULE.ROWS) + 13,
    A,
  );
  sh.getRange(1, A).setValue(t_("settings.activity"));
  if (cfg.activities.length) {
    sh.getRange(2, A, cfg.activities.length, 1).setValues(
      cfg.activities.map((a) => [asText_(a)]),
    );
  }

  sh.getRange(1, 1, 1, 3).setValues([
    [t_("settings.habit"), t_("settings.xp"), t_("settings.days")],
  ]);
  sh.getRange(2, 1, rows.length, 3).setValues(rows);
  sh.getRange(1, 5, 4, 2).setValues([
    [t_("settings.param"), t_("settings.value")],
    [t_("settings.xpPerLevel"), params[0]],
    [t_("settings.coinsPerXp"), params[1]],
    [t_("settings.streakThreshold"), params[2]],
  ]);
  sh.getRange(1, 8, help.length, 1).setValues(help.map((s) => [s]));
  sh.getRange(1, R, 1, 4).setValues([
    [
      t_("settings.rule"),
      t_("settings.xp"),
      t_("settings.kind"),
      t_("settings.days"),
    ],
  ]);
  if (ruleRows.length)
    sh.getRange(2, R, ruleRows.length, 4).setValues(ruleRows);

  const dv = SpreadsheetApp.newDataValidation;
  const daysRule = dv()
    .requireValueInList(Object.keys(DAYSETS).map(dayLabel_), true)
    .setAllowInvalid(false)
    .setHelpText(t_("settings.daysHelp"))
    .build();
  const xpRule = dv()
    .requireNumberBetween(0, 1000)
    .setAllowInvalid(false)
    .setHelpText(t_("settings.xpHelp"))
    .build();
  sh.getRange(2, 3, rows.length + 12, 1).setDataValidation(daysRule);
  sh.getRange(2, 2, rows.length + 12, 1).setDataValidation(xpRule);
  sh.getRange(2, R + 3, ruleRows.length + 12, 1).setDataValidation(daysRule);
  sh.getRange(2, R + 1, ruleRows.length + 12, 1).setDataValidation(xpRule);
  sh.getRange(2, R + 2, ruleRows.length + 12, 1).setDataValidation(
    dv()
      .requireValueInList(RULE_KINDS.map(kindLabel_), true)
      .setAllowInvalid(false)
      .setHelpText(t_("settings.kindHelp"))
      .build(),
  );
  sh.getRange("F2").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireNumberBetween(1, 1000000)
      .setAllowInvalid(false)
      .build(),
  );
  sh.getRange("F3").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireNumberBetween(0, 100)
      .setAllowInvalid(false)
      .build(),
  );
  sh.getRange("F4").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireNumberBetween(0.01, 1)
      .setAllowInvalid(false)
      .setHelpText(t_("settings.thresholdHelp"))
      .build(),
  );
  sh.getRange("F4").setNumberFormat("0%");
}

// ---------- Tasks ----------
function buildTasks_(sh, state) {
  const cfg = cfg_();
  const src = state
    ? state.tasks
    : cfg.tasks.map((t) => [
        false,
        t.title,
        t.category,
        t.deadline,
        priorityLabel_(t.priority),
        t.xp,
        "",
        "",
      ]);
  const total = Math.max(LAYOUT.TASK_ROWS, src.length + 50);
  trimSheet_(sh, total + 1, 9);

  sh.getRange(1, 1, 1, 8).setValues([
    [
      t_("tasks.done"),
      t_("tasks.title"),
      t_("tasks.category"),
      t_("tasks.deadline"),
      t_("tasks.priority"),
      t_("tasks.xp"),
      t_("tasks.notes"),
      t_("tasks.completed"),
    ],
  ]);
  sh.getRange("I1").setFormula(
    "={" +
      tq_("tasks.left") +
      ';ARRAYFORMULA(IF((B2:B="")+(A2:A=TRUE)+(D2:D=""),"",IFERROR(INT(D2:D)-TODAY(),"")))}',
  );

  const rows = src.map((r) => [
    r[0] === true,
    r[1],
    r[2],
    U.dateF(r[3]),
    r[4],
    r[5] || 20,
    r[6] || "",
    U.dateF(r[7]),
  ]);
  if (rows.length) sh.getRange(2, 1, rows.length, 8).setValues(rows);
  const empty = total - rows.length;
  if (empty > 0) {
    sh.getRange(2 + rows.length, 1, empty, 1).setValues(
      U.fill(empty, 1, false),
    );
    sh.getRange(2 + rows.length, 6, empty, 1).setValues(U.fill(empty, 1, 20));
  }
  sh.getRange(2, 1, total, 1).insertCheckboxes();

  const dv = SpreadsheetApp.newDataValidation;
  sh.getRange(2, 3, total, 1).setDataValidation(
    dv().requireValueInList(cfg.categories, true).setAllowInvalid(true).build(),
  );
  sh.getRange(2, 4, total, 1).setDataValidation(
    dv()
      .requireDate()
      .setAllowInvalid(false)
      .setHelpText(t_("tasks.deadlineHelp"))
      .build(),
  );
  sh.getRange(2, 5, total, 1).setDataValidation(
    dv()
      .requireValueInList(PRIORITY_KEYS.map(priorityLabel_), true)
      .setAllowInvalid(true)
      .build(),
  );
  sh.getRange(2, 6, total, 1).setDataValidation(
    dv()
      .requireNumberBetween(0, 500)
      .setAllowInvalid(false)
      .setHelpText(t_("tasks.xpHelp"))
      .build(),
  );
  sh.getRange(2, 4, total, 1).setNumberFormat(t_("fmt.date"));
  sh.getRange(2, 8, total, 1).setNumberFormat(t_("fmt.date"));
  sh.getRange(2, 9, total, 1).setNumberFormat(t_("fmt.daysLeft"));
  sh.getRange(1, 1, total + 1, 9).createFilter();
}

// ---------- Shop ----------
function buildShop_(sh, state) {
  const SH = names_();
  const src = state
    ? state.shop
    : cfg_().rewards.map((r) => [r.name, r.price, false, ""]);
  const total = Math.max(LAYOUT.SHOP_ROWS, src.length + 20);
  trimSheet_(sh, total + 1, 7);
  sh.getRange(1, 1, 1, 4).setValues([
    [t_("shop.reward"), t_("shop.price"), t_("shop.bought"), t_("shop.date")],
  ]);
  const rows = src.map((r) => [r[0], r[1], r[2] === true, U.dateF(r[3])]);
  if (rows.length) sh.getRange(2, 1, rows.length, 4).setValues(rows);
  const empty = total - rows.length;
  if (empty > 0)
    sh.getRange(2 + rows.length, 3, empty, 1).setValues(
      U.fill(empty, 1, false),
    );
  sh.getRange(2, 3, total, 1).insertCheckboxes();
  sh.getRange(2, 2, total, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireNumberBetween(1, 100000)
      .setAllowInvalid(false)
      .setHelpText(t_("shop.priceHelp"))
      .build(),
  );
  sh.getRange(2, 4, total, 1).setNumberFormat(t_("fmt.date"));

  const D6 = U.q(SH.dash) + "!D6";
  sh.getRange("F1:G3").setValues([
    [t_("shop.balance"), "=" + U.q(SH.dash) + "!F6"],
    [t_("shop.earned"), "=FLOOR(" + D6 + "*" + U.q(SH.cfg) + "!F3)"],
    [t_("shop.spent"), "=SUMIF(C2:C,TRUE,B2:B)"],
  ]);
  sh.getRange("F5").setValue(t_("shop.hint"));
}
