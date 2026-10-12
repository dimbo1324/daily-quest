/**
 * Building the sheets. Formulas are written in en_US syntax (R1C1 where rows repeat), which is
 * why buildAll_ forces the spreadsheet locale: in a comma-decimal locale they break with #ERROR!.
 */

function buildAll_(state) {
  const cfg = cfg_();
  assertValidCfg_(cfg);
  const SH = names_();
  const ss = ss_();
  ss.setSpreadsheetTimeZone(cfg.timezone);
  ss.setSpreadsheetLocale('en_US');
  SpreadsheetApp.flush();

  // Delete everything except the backup.
  const tmp = ss.insertSheet('__tmp_' + Date.now());
  ss.getSheets().forEach(s => {
    if (s.getSheetId() !== tmp.getSheetId() && s.getName() !== SH.backup) ss.deleteSheet(s);
  });
  const sheets = {};
  [['dash', SH.dash], ['habits', SH.habits], ['tasks', SH.tasks], ['shop', SH.shop], ['cfg', SH.cfg]]
    .forEach(([k, n], i) => { sheets[k] = ss.insertSheet(n, i); });
  ss.deleteSheet(tmp);

  const [start, days] = calendarPeriod_(cfg, U.todayParts(), state && state.firstDate);

  buildSettings_(sheets.cfg, state);
  buildHabits_(sheets.habits, start, days);
  buildTasks_(sheets.tasks, state);
  buildShop_(sheets.shop, state);
  buildDashboard_(sheets.dash);
  SpreadsheetApp.flush();

  if (state) restoreHabits_(sheets.habits, state);

  styleAll_();
  protectAll_();

  const bk = ss.getSheetByName(SH.backup);
  if (bk && !bk.isSheetHidden()) bk.hideSheet();
  const props = PropertiesService.getDocumentProperties();
  props.setProperty('dq_version', VERSION);
  props.setProperty('dq_built_at', new Date().toISOString());
  ss.setActiveSheet(sheets.dash);
}

function trimSheet_(sh, rows, cols) {
  const mr = sh.getMaxRows(), mc = sh.getMaxColumns();
  if (mr > rows) sh.deleteRows(rows + 1, mr - rows); else if (mr < rows) sh.insertRowsAfter(mr, rows - mr);
  if (mc > cols) sh.deleteColumns(cols + 1, mc - cols); else if (mc < cols) sh.insertColumnsAfter(mc, cols - mc);
}

function ensureRows_(sh, lastRow) {
  const mr = sh.getMaxRows();
  if (mr < lastRow) sh.insertRowsAfter(mr, lastRow - mr);
}

function habitCols_() {
  const n = cfg_().habits.length;
  const first = 3, last = 2 + n;
  return { n, first, last, xp: last + 1, pct: last + 2, streak: last + 3, width: last + 3 };
}

function quoteList_(items) {
  return items.map(s => '"' + String(s).replace(/"/g, '""') + '"').join(',');
}

// ---------- Settings ----------
function buildSettings_(sh, state) {
  const cfg = cfg_();
  const rows = cfg.habits.map(h => [
    h.name, (state && state.xp && state.xp[h.name] != null) ? state.xp[h.name] : h.xp, dayLabel_(h.days),
  ]);
  const params = (state && state.params) ? state.params : [cfg.xpPerLevel, cfg.coinsPerXp, cfg.streakThreshold];
  const help = t_('settings.help');
  trimSheet_(sh, Math.max(rows.length + 13, help.length + 1), 8);

  sh.getRange(1, 1, 1, 3).setValues([[t_('settings.habit'), t_('settings.xp'), t_('settings.days')]]);
  sh.getRange(2, 1, rows.length, 3).setValues(rows);
  sh.getRange(1, 5, 4, 2).setValues([
    [t_('settings.param'), t_('settings.value')],
    [t_('settings.xpPerLevel'), params[0]],
    [t_('settings.coinsPerXp'), params[1]],
    [t_('settings.streakThreshold'), params[2]],
  ]);
  sh.getRange(1, 8, help.length, 1).setValues(help.map(s => [s]));
  sh.getRange(2, 3, rows.length + 12, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.keys(DAYSETS).map(dayLabel_), true).setAllowInvalid(false)
    .setHelpText(t_('settings.daysHelp')).build());
  sh.getRange(2, 2, rows.length + 12, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 1000).setAllowInvalid(false).setHelpText(t_('settings.xpHelp')).build());
  sh.getRange('F2').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 1000000).setAllowInvalid(false).build());
  sh.getRange('F3').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 100).setAllowInvalid(false).build());
  sh.getRange('F4').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0.01, 1).setAllowInvalid(false).setHelpText(t_('settings.thresholdHelp')).build());
  sh.getRange('F4').setNumberFormat('0%');
}

// ---------- Habits ----------
function buildHabits_(sh, start, days) {
  const c = habitCols_();
  const habits = cfg_().habits;
  const cfgName = U.q(names_().cfg);
  trimSheet_(sh, LAYOUT.FIRST_ROW - 1 + days, c.width);
  const header = [t_('habits.date'), t_('habits.day')].concat(habits.map(h => h.name),
    [t_('habits.xp'), t_('habits.done'), t_('habits.streak')]);
  const xpRow = ['', t_('habits.xp')].concat(habits.map((h, i) => '=' + cfgName + '!B' + (i + 2)), ['', '', '']);
  sh.getRange(1, 1, 1, c.width).setValues([header]);
  sh.getRange(2, 1, 1, c.width).setValues([xpRow]);
  appendDays_(sh, days, start, true);
}

/** Appends n days at the end of the sheet (or from `start` when the sheet is empty). */
function appendDays_(sh, n, start, forceFresh) {
  const c = habitCols_();
  const habits = cfg_().habits;
  const last = sh.getLastRow();
  const fresh = forceFresh === true || last < LAYOUT.FIRST_ROW;
  let base;
  if (fresh) {
    base = start || U.todayParts();
  } else {
    const lastIso = lastDateIso_(sh);
    if (!lastIso) throw new Error(t_('err.lastDate', names_().habits));
    base = U.addDays(U.parts(lastIso), 1);
  }
  const startRow = fresh ? LAYOUT.FIRST_ROW : last + 1;
  ensureRows_(sh, startRow + n - 1);

  // Dates and weekdays
  const weekdayF = '=CHOOSE(WEEKDAY(RC1,2),' + quoteList_(t_('weekdays')) + ')';
  const ab = [];
  for (let i = 0; i < n; i++) {
    const dateF = (i === 0 && fresh) ? '=DATE(' + base[0] + ',' + base[1] + ',' + base[2] + ')' : '=R[-1]C+1';
    ab.push([dateF, weekdayF]);
  }
  sh.getRange(startRow, 1, n, 2).setFormulasR1C1(ab);

  // Ticks: active days get checkboxes, inactive days get «—»
  const block = sh.getRange(startRow, c.first, n, c.n);
  block.setValues(U.fill(n, c.n, false));
  block.insertCheckboxes();
  const inactive = [];
  for (let i = 0; i < n; i++) {
    const wd = U.weekday(U.addDays(base, i));
    habits.forEach((h, j) => {
      if (!DAYSETS[h.days][wd]) inactive.push(U.col(c.first + j) + (startRow + i));
    });
  }
  if (inactive.length) {
    sh.getRangeList(inactive).removeCheckboxes();
    sh.getRangeList(inactive).setValue('—');
  }

  // XP, completion %, streak
  const r = 'RC' + c.first + ':RC' + c.last;
  const xpF = '=SUMPRODUCT(--(' + r + '=TRUE),R2C' + c.first + ':R2C' + c.last + ')';
  const pctF = '=IFERROR(COUNTIF(' + r + ',TRUE)/(COUNTIF(' + r + ',TRUE)+COUNTIF(' + r + ',FALSE)),0)';
  const stF = '=IF(RC1>TODAY(),"",IF(RC[-1]>=' + U.q(names_().cfg) + '!R4C6,N(R[-1]C)+1,0))';
  sh.getRange(startRow, c.xp, n, 3).setFormulasR1C1(U.fill(n, 1, null).map(() => [xpF, pctF, stF]));
}

// ---------- Tasks ----------
function buildTasks_(sh, state) {
  const cfg = cfg_();
  const src = state
    ? state.tasks
    : cfg.tasks.map(t => [false, t.title, t.category, t.deadline, priorityLabel_(t.priority), t.xp, '', '']);
  const total = Math.max(LAYOUT.TASK_ROWS, src.length + 50);
  trimSheet_(sh, total + 1, 9);

  sh.getRange(1, 1, 1, 8).setValues([[t_('tasks.done'), t_('tasks.title'), t_('tasks.category'), t_('tasks.deadline'),
    t_('tasks.priority'), t_('tasks.xp'), t_('tasks.notes'), t_('tasks.completed')]]);
  sh.getRange('I1').setFormula(
    '={' + tq_('tasks.left') + ';ARRAYFORMULA(IF((B2:B="")+(A2:A=TRUE)+(D2:D=""),"",IFERROR(INT(D2:D)-TODAY(),"")))}');

  const rows = src.map(r => [r[0] === true, r[1], r[2], U.dateF(r[3]), r[4], r[5] || 20, r[6] || '', U.dateF(r[7])]);
  if (rows.length) sh.getRange(2, 1, rows.length, 8).setValues(rows);
  const empty = total - rows.length;
  if (empty > 0) {
    sh.getRange(2 + rows.length, 1, empty, 1).setValues(U.fill(empty, 1, false));
    sh.getRange(2 + rows.length, 6, empty, 1).setValues(U.fill(empty, 1, 20));
  }
  sh.getRange(2, 1, total, 1).insertCheckboxes();

  const dv = SpreadsheetApp.newDataValidation;
  sh.getRange(2, 3, total, 1).setDataValidation(dv().requireValueInList(cfg.categories, true).setAllowInvalid(true).build());
  sh.getRange(2, 4, total, 1).setDataValidation(dv().requireDate().setAllowInvalid(false)
    .setHelpText(t_('tasks.deadlineHelp')).build());
  sh.getRange(2, 5, total, 1).setDataValidation(dv().requireValueInList(PRIORITY_KEYS.map(priorityLabel_), true)
    .setAllowInvalid(true).build());
  sh.getRange(2, 6, total, 1).setDataValidation(dv().requireNumberBetween(0, 500).setAllowInvalid(false)
    .setHelpText(t_('tasks.xpHelp')).build());
  sh.getRange(2, 4, total, 1).setNumberFormat(t_('fmt.date'));
  sh.getRange(2, 8, total, 1).setNumberFormat(t_('fmt.date'));
  sh.getRange(2, 9, total, 1).setNumberFormat(t_('fmt.daysLeft'));
  sh.getRange(1, 1, total + 1, 9).createFilter();
}

// ---------- Shop ----------
function buildShop_(sh, state) {
  const SH = names_();
  const src = state ? state.shop : cfg_().rewards.map(r => [r.name, r.price, false, '']);
  const total = Math.max(LAYOUT.SHOP_ROWS, src.length + 20);
  trimSheet_(sh, total + 1, 7);
  sh.getRange(1, 1, 1, 4).setValues([[t_('shop.reward'), t_('shop.price'), t_('shop.bought'), t_('shop.date')]]);
  const rows = src.map(r => [r[0], r[1], r[2] === true, U.dateF(r[3])]);
  if (rows.length) sh.getRange(2, 1, rows.length, 4).setValues(rows);
  const empty = total - rows.length;
  if (empty > 0) sh.getRange(2 + rows.length, 3, empty, 1).setValues(U.fill(empty, 1, false));
  sh.getRange(2, 3, total, 1).insertCheckboxes();
  sh.getRange(2, 2, total, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 100000).setAllowInvalid(false).setHelpText(t_('shop.priceHelp')).build());
  sh.getRange(2, 4, total, 1).setNumberFormat(t_('fmt.date'));

  const D6 = U.q(SH.dash) + '!D6';
  sh.getRange('F1:G3').setValues([
    [t_('shop.balance'), '=' + U.q(SH.dash) + '!F6'],
    [t_('shop.earned'), '=FLOOR(' + D6 + '*' + U.q(SH.cfg) + '!F3)'],
    [t_('shop.spent'), '=SUMIF(C2:C,TRUE,B2:B)'],
  ]);
  sh.getRange('F5').setValue(t_('shop.hint'));
}

// ---------- Dashboard ----------
function buildDashboard_(sh) {
  const cfg = cfg_();
  const SH = names_();
  const c = habitCols_();
  const n = cfg.habits.length;
  trimSheet_(sh, Math.max(D.HAB + n + 2, D.CAT_H + cfg.categories.length + 2), 26);

  const hS = U.q(SH.habits), tS = U.q(SH.tasks), sS = U.q(SH.shop), cS = U.q(SH.cfg);
  const xpL = U.col(c.xp), pctL = U.col(c.pct), stL = U.col(c.streak);
  const FR = LAYOUT.FIRST_ROW;
  const at = (col, day) => 'IFERROR(INDEX(' + hS + '!' + col + ':' + col + ',MATCH(' + day + ',' + hS + '!A:A,0)),0)';
  const todayPct = at(pctL, 'TODAY()');
  const per = cS + '!$F$2', coin = cS + '!$F$3', thr = cS + '!$F$4';
  const spent = 'SUMIF(' + sS + '!C2:C,TRUE,' + sS + '!B2:B)';
  const earned = 'FLOOR(D6*' + coin + ')';
  const last7 = hS + '!A:A,"<="&TODAY(),' + hS + '!A:A,">"&(TODAY()-7)';
  const shopGid = sheet_(SH.shop).getSheetId();
  const taskGid = sheet_(SH.tasks).getSheetId();
  const habGid = sheet_(SH.habits).getSheetId();
  const cond = tS + '!A2:A=FALSE,' + tS + '!B2:B<>"",ISNUMBER(' + tS + '!D2:D)';
  const ranks = quoteList_(t_('ranks'));
  const nRanks = t_('ranks').length;
  const dateFmt = '"' + t_('fmt.date') + '"';

  const cells = {
    B2: t_('dash.title'),
    B3: '=' + tq_('dash.subLevel') + '&B6&" · "&B7&" · "&TEXT(TODAY(),' + dateFmt + ')&' +
      tq_('dash.subStreak') + '&D11&' + tq_('dash.subDays'),

    B5: t_('dash.level'), D5: t_('dash.totalXp'), F5: t_('dash.coins'),
    B6: '=INT(D6/' + per + ')+1',
    D6: '=SUM(' + hS + '!' + xpL + FR + ':' + xpL + ')+SUMIF(' + tS + '!A2:A,TRUE,' + tS + '!F2:F)',
    F6: '=' + earned + '-' + spent,
    B7: '=CHOOSE(MIN(B6,' + nRanks + '),' + ranks + ')',
    D7: '=SPARKLINE(MOD(D6,' + per + '),{"charttype","bar";"max",' + per + ';"color1","' + TH.green + '"})',
    F7: '=HYPERLINK("#gid=' + shopGid + '",' + tq_('dash.openShop') + ')',
    B8: '=' + tq_('dash.toLevel') + '&(B6+1)&": "&(' + per + '-MOD(D6,' + per + '))&" XP"',
    D8: '=MOD(D6,' + per + ')&" / "&' + per + '&' + tq_('dash.onLevel'),
    F8: '=' + tq_('dash.earned') + '&' + earned + '&' + tq_('dash.spent') + '&' + spent,

    B10: t_('dash.todayXp'), D10: t_('dash.streakDays'), F10: t_('dash.avg7'),
    B11: '=' + at(xpL, 'TODAY()'),
    D11: '=MAX(N(' + at(stL, 'TODAY()') + '),N(' + at(stL, 'TODAY()-1') + '))',
    F11: '=IFERROR(AVERAGEIFS(' + hS + '!' + pctL + ':' + pctL + ',' + last7 + '),0)',
    B12: '=SPARKLINE(' + todayPct + ',{"charttype","bar";"max",1;"color1","' + TH.green + '"})',
    D12: '=' + tq_('dash.streakRule') + '&TEXT(' + thr + ',"0%")',
    F12: '=SPARKLINE(F11,{"charttype","bar";"max",1;"color1","' + TH.accent + '"})',
    B13: '=TEXT(' + todayPct + ',"0%")&' + tq_('dash.habitsToday'),
    D13: '=' + tq_('dash.record') + '&MAX(' + hS + '!' + stL + FR + ':' + stL + ')&' + tq_('dash.subDays'),
    F13: '=' + tq_('dash.weekXp') + '&SUMIFS(' + hS + '!' + xpL + ':' + xpL + ',' + last7 + ')',

    B15: t_('dash.overdue'), D15: t_('dash.dueSoon'), F15: t_('dash.openTasks'),
    B16: '=COUNTIFS(' + tS + '!A2:A,FALSE,' + tS + '!B2:B,"<>",' + tS + '!D2:D,"<"&TODAY())',
    D16: '=COUNTIFS(' + tS + '!A2:A,FALSE,' + tS + '!B2:B,"<>",' + tS + '!D2:D,">="&TODAY(),' + tS + '!D2:D,"<"&(TODAY()+4))',
    F16: '=COUNTIFS(' + tS + '!A2:A,FALSE,' + tS + '!B2:B,"<>")',
    B17: t_('dash.overdueHint'),
    D17: t_('dash.dueSoonHint'),
    F17: '=' + tq_('dash.doneCount') + '&COUNTIFS(' + tS + '!A2:A,TRUE,' + tS + '!B2:B,"<>")',
  };
  cells['B' + D.TASKS_H] = '=HYPERLINK("#gid=' + taskGid + '",' + tq_('dash.nextTasks') + ')';
  cells['D' + D.TASKS_H] = t_('dash.deadline');
  cells['F' + D.TASKS_H] = t_('dash.left');
  cells['B' + D.TASKS] = '=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER(' + tS + '!B2:B,' + cond + '),FILTER(' + tS + '!D2:D,' + cond +
    '),TRUE),' + LAYOUT.TASK_LIST + ',1),' + tq_('dash.noTasks') + ')';
  cells['D' + D.TASKS] = '=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER(' + tS + '!D2:D,' + cond + '),1,TRUE),' + LAYOUT.TASK_LIST + ',1),"")';
  const tEnd = D.TASKS + LAYOUT.TASK_LIST - 1;
  cells['F' + D.TASKS] = '=ARRAYFORMULA(IF(ISNUMBER(D' + D.TASKS + ':D' + tEnd + '),INT(D' + D.TASKS + ':D' + tEnd + ')-TODAY(),""))';

  cells['B' + D.HAB_H] = '=HYPERLINK("#gid=' + habGid + '",' + tq_('dash.habits30') + ')';
  cells['D' + D.HAB_H] = t_('dash.progress');
  cells['F' + D.HAB_H] = t_('dash.done');
  const win = hS + '!$A$' + FR + ':$A,">"&(TODAY()-30),' + hS + '!$A$' + FR + ':$A,"<="&TODAY()';
  cfg.habits.forEach((h, i) => {
    const r = D.HAB + i, L = U.col(c.first + i);
    const yes = 'COUNTIFS(' + hS + '!' + L + '$' + FR + ':' + L + ',TRUE,' + win + ')';
    const no = 'COUNTIFS(' + hS + '!' + L + '$' + FR + ':' + L + ',FALSE,' + win + ')';
    cells['B' + r] = '=' + cS + '!A' + (i + 2);
    cells['F' + r] = '=IFERROR(' + yes + '/(' + yes + '+' + no + '),0)';
    cells['D' + r] = '=SPARKLINE(F' + r + ',{"charttype","bar";"max",1;"color1",IF(F' + r + '>=0.8,"' + TH.green +
      '",IF(F' + r + '>=0.5,"' + TH.yellow + '","' + TH.red + '"))})';
  });

  // Hidden chart data (X:Z)
  cells.X2 = t_('dash.chartDate'); cells.Y2 = t_('dash.chartXp'); cells.Z2 = t_('dash.chartDone');
  cells.X3 = '=SEQUENCE(30,1,TODAY()-29,1)';
  cells.Y3 = '=ARRAYFORMULA(IFERROR(VLOOKUP(X3:X32,' + hS + '!A' + FR + ':' + pctL + ',' + c.xp + ',FALSE),0))';
  cells.Z3 = '=ARRAYFORMULA(IFERROR(VLOOKUP(X3:X32,' + hS + '!A' + FR + ':' + pctL + ',' + c.pct + ',FALSE),0))';
  cells['X' + D.CAT_H] = t_('dash.category');
  cells['Y' + D.CAT_H] = t_('dash.open');
  cfg.categories.forEach((cat, i) => {
    const r = D.CAT_H + 1 + i;
    cells['X' + r] = cat;
    cells['Y' + r] = '=COUNTIFS(' + tS + '!C2:C,X' + r + ',' + tS + '!A2:A,FALSE,' + tS + '!B2:B,"<>")';
  });

  Object.keys(cells).forEach(a1 => {
    const v = cells[a1];
    const rg = sh.getRange(a1);
    if (typeof v === 'string' && v.charAt(0) === '=') rg.setFormula(v); else rg.setValue(v);
  });

  sh.getRange('D6').setNumberFormat('#,##0');
  sh.getRange('F6').setNumberFormat('#,##0');
  sh.getRange('F11').setNumberFormat('0%');
  sh.getRange('D' + D.TASKS + ':D' + tEnd).setNumberFormat(t_('fmt.date'));
  sh.getRange('F' + D.TASKS + ':F' + tEnd).setNumberFormat(t_('fmt.daysLeft'));
  sh.getRange('F' + D.HAB + ':F' + (D.HAB + n - 1)).setNumberFormat('0%');
  sh.getRange('X3:X32').setNumberFormat(t_('fmt.dayMonth'));
  sh.getRange('Z3:Z32').setNumberFormat('0%');
}
