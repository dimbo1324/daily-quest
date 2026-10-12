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
  const trackers = trackers_();
  const sheets = {};
  [['dash', SH.dash]].concat(trackers.map(t => [t.key, t.sheet]), [['tasks', SH.tasks], ['shop', SH.shop], ['cfg', SH.cfg]])
    .forEach(([k, n], i) => { sheets[k] = ss.insertSheet(n, i); });
  ss.deleteSheet(tmp);

  const [start, days] = calendarPeriod_(cfg, U.todayParts(), state && state.firstDate);

  buildSettings_(sheets.cfg, state);
  trackers.forEach(t => buildTracker_(sheets[t.key], t, start, days));
  buildTasks_(sheets.tasks, state);
  buildShop_(sheets.shop, state);
  buildDashboard_(sheets.dash);
  SpreadsheetApp.flush();

  if (state) trackers.forEach(t => restoreTicks_(sheets[t.key], t, state));

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

function quoteList_(items) {
  return items.map(s => '"' + String(s).replace(/"/g, '""') + '"').join(',');
}

// ---------- Settings ----------
function buildSettings_(sh, state) {
  const cfg = cfg_();
  const rows = cfg.habits.map(h => [
    h.name, (state && state.xp && state.xp[h.name] != null) ? state.xp[h.name] : h.xp, dayLabel_(h.days),
  ]);
  const ruleXp = (state && state.ruleXp) || {};
  const ruleRows = cfg.rules.map(r => [
    r.name, ruleXp[r.name] != null ? ruleXp[r.name] : r.xp, kindLabel_(r.kind), dayLabel_(r.days),
  ]);
  const params = (state && state.params) ? state.params : [cfg.xpPerLevel, cfg.coinsPerXp, cfg.streakThreshold];
  const help = t_('settings.help');
  const R = SETTINGS_COL.rules;
  trimSheet_(sh, Math.max(rows.length, ruleRows.length, help.length) + 13, R + 3);

  sh.getRange(1, 1, 1, 3).setValues([[t_('settings.habit'), t_('settings.xp'), t_('settings.days')]]);
  sh.getRange(2, 1, rows.length, 3).setValues(rows);
  sh.getRange(1, 5, 4, 2).setValues([
    [t_('settings.param'), t_('settings.value')],
    [t_('settings.xpPerLevel'), params[0]],
    [t_('settings.coinsPerXp'), params[1]],
    [t_('settings.streakThreshold'), params[2]],
  ]);
  sh.getRange(1, 8, help.length, 1).setValues(help.map(s => [s]));
  sh.getRange(1, R, 1, 4).setValues([[t_('settings.rule'), t_('settings.xp'), t_('settings.kind'), t_('settings.days')]]);
  if (ruleRows.length) sh.getRange(2, R, ruleRows.length, 4).setValues(ruleRows);

  const dv = SpreadsheetApp.newDataValidation;
  const daysRule = dv().requireValueInList(Object.keys(DAYSETS).map(dayLabel_), true).setAllowInvalid(false)
    .setHelpText(t_('settings.daysHelp')).build();
  const xpRule = dv().requireNumberBetween(0, 1000).setAllowInvalid(false).setHelpText(t_('settings.xpHelp')).build();
  sh.getRange(2, 3, rows.length + 12, 1).setDataValidation(daysRule);
  sh.getRange(2, 2, rows.length + 12, 1).setDataValidation(xpRule);
  sh.getRange(2, R + 3, ruleRows.length + 12, 1).setDataValidation(daysRule);
  sh.getRange(2, R + 1, ruleRows.length + 12, 1).setDataValidation(xpRule);
  sh.getRange(2, R + 2, ruleRows.length + 12, 1).setDataValidation(dv()
    .requireValueInList(RULE_KINDS.map(kindLabel_), true).setAllowInvalid(false).setHelpText(t_('settings.kindHelp')).build());
  sh.getRange('F2').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 1000000).setAllowInvalid(false).build());
  sh.getRange('F3').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 100).setAllowInvalid(false).build());
  sh.getRange('F4').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0.01, 1).setAllowInvalid(false).setHelpText(t_('settings.thresholdHelp')).build());
  sh.getRange('F4').setNumberFormat('0%');
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
  const rules = tracker_('rules');
  const m = rules ? rules.items.length : 0;
  const rH = rulesHeaderRow_();
  trimSheet_(sh, Math.max(rH + m + 2, D.CAT_H + cfg.categories.length + 2), 26);

  const hS = U.q(SH.habits), tS = U.q(SH.tasks), sS = U.q(SH.shop), cS = U.q(SH.cfg);
  const xpL = U.col(c.xp), pctL = U.col(c.pct), stL = U.col(c.streak);
  const FR = LAYOUT.FIRST_ROW;
  const atIn = (sheetQ, col, day) => 'IFERROR(INDEX(' + sheetQ + '!' + col + ':' + col + ',MATCH(' + day + ',' + sheetQ + '!A:A,0)),0)';
  const at = (col, day) => atIn(hS, col, day);
  const rc = rules ? trackCols_(rules) : null;
  const rS = rules ? U.q(rules.sheet) : '';
  const rXpL = rules ? U.col(rc.xp) : '';
  const rPctL = rules ? U.col(rc.pct) : '';
  const plusRules = expr => rules ? '+' + expr : '';
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
    D6: '=SUM(' + hS + '!' + xpL + FR + ':' + xpL + ')' + plusRules('SUM(' + rS + '!' + rXpL + FR + ':' + rXpL + ')') +
      '+SUMIF(' + tS + '!A2:A,TRUE,' + tS + '!F2:F)',
    F6: '=' + earned + '-' + spent,
    B7: '=CHOOSE(MIN(B6,' + nRanks + '),' + ranks + ')',
    D7: '=SPARKLINE(MOD(D6,' + per + '),{"charttype","bar";"max",' + per + ';"color1","' + TH.green + '"})',
    F7: '=HYPERLINK("#gid=' + shopGid + '",' + tq_('dash.openShop') + ')',
    B8: '=' + tq_('dash.toLevel') + '&(B6+1)&": "&(' + per + '-MOD(D6,' + per + '))&" XP"',
    D8: '=MOD(D6,' + per + ')&" / "&' + per + '&' + tq_('dash.onLevel'),
    F8: '=' + tq_('dash.earned') + '&' + earned + '&' + tq_('dash.spent') + '&' + spent,

    B10: t_('dash.todayXp'), D10: t_('dash.streakDays'), F10: t_('dash.avg7'),
    B11: '=' + at(xpL, 'TODAY()') + plusRules(atIn(rS, rXpL, 'TODAY()')),
    D11: '=MAX(N(' + at(stL, 'TODAY()') + '),N(' + at(stL, 'TODAY()-1') + '))',
    F11: '=IFERROR(AVERAGEIFS(' + hS + '!' + pctL + ':' + pctL + ',' + last7 + '),0)',
    B12: '=SPARKLINE(' + todayPct + ',{"charttype","bar";"max",1;"color1","' + TH.green + '"})',
    D12: '=' + tq_('dash.streakRule') + '&TEXT(' + thr + ',"0%")',
    F12: '=SPARKLINE(F11,{"charttype","bar";"max",1;"color1","' + TH.accent + '"})',
    B13: '=TEXT(' + todayPct + ',"0%")&' + tq_('dash.habitsToday'),
    D13: '=' + tq_('dash.record') + '&MAX(' + hS + '!' + stL + FR + ':' + stL + ')&' + tq_('dash.subDays'),
    F13: '=' + tq_('dash.weekXp') + '&(SUMIFS(' + hS + '!' + xpL + ':' + xpL + ',' + last7 + ')' +
      plusRules('SUMIFS(' + rS + '!' + rXpL + ':' + rXpL + ',' + rS + '!A:A,"<="&TODAY(),' + rS + '!A:A,">"&(TODAY()-7))') + ')',

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

  if (rules) {
    const rWin = rS + '!$A$' + FR + ':$A,">"&(TODAY()-30),' + rS + '!$A$' + FR + ':$A,"<="&TODAY()';
    const rStart = rS + '!$A$' + FR;
    cells['B' + rH] = '=HYPERLINK("#gid=' + sheet_(rules.sheet).getSheetId() + '",' + tq_('dash.rules') + ')';
    cells['D' + rH] = t_('dash.ruleStreak');
    cells['F' + rH] = t_('dash.ruleKept');
    rules.items.forEach((item, i) => {
      const r = rH + 1 + i, L = U.col(rc.first + i);
      const col = rS + '!' + L + '$' + FR + ':' + L;
      const yes = 'COUNTIFS(' + col + ',TRUE,' + rWin + ')';
      const no = 'COUNTIFS(' + col + ',FALSE,' + rWin + ')';
      // Clean streak: days since the last missed day before today, plus today once it is ticked.
      const lastMiss = 'MAXIFS(' + rS + '!$A$' + FR + ':$A,' + col + ',FALSE,' + rS + '!$A$' + FR + ':$A,"<"&TODAY())';
      const todayKept = 'COUNTIFS(' + rS + '!$A$' + FR + ':$A,TODAY(),' + col + ',TRUE)';
      cells['B' + r] = '=' + cS + '!' + U.col(SETTINGS_COL.rules) + (i + 2);
      cells['D' + r] = '=MAX(0,TODAY()-1-MAX(' + lastMiss + ',' + rStart + '-1))+' + todayKept;
      cells['F' + r] = '=IFERROR(' + yes + '/(' + yes + '+' + no + '),0)';
    });
  }

  // Hidden chart data (X:Z)
  cells.X2 = t_('dash.chartDate'); cells.Y2 = t_('dash.chartXp'); cells.Z2 = t_('dash.chartDone');
  cells.X3 = '=SEQUENCE(30,1,TODAY()-29,1)';
  cells.Y3 = '=ARRAYFORMULA(IFERROR(VLOOKUP(X3:X32,' + hS + '!A' + FR + ':' + pctL + ',' + c.xp + ',FALSE),0)' +
    plusRules('IFERROR(VLOOKUP(X3:X32,' + rS + '!A' + FR + ':' + rPctL + ',' + rc.xp + ',FALSE),0)') + ')';
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
  if (m) {
    sh.getRange('D' + (rH + 1) + ':D' + (rH + m)).setNumberFormat(t_('fmt.streakDays'));
    sh.getRange('F' + (rH + 1) + ':F' + (rH + m)).setNumberFormat('0%');
  }
  sh.getRange('X3:X32').setNumberFormat(t_('fmt.dayMonth'));
  sh.getRange('Z3:Z32').setNumberFormat('0%');
}

/** Dashboard row of the rules section header: one gap row below the habit list. */
function rulesHeaderRow_() {
  return D.HAB + cfg_().habits.length + 1;
}
