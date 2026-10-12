/**
 * Dark, calm styling of every sheet, charts, and soft formula protection.
 */

function styleAll_() {
  const SH = names_();
  const map = [[SH.cfg, styleSettings_]]
    .concat(trackers_().map(t => [t.sheet, sh => styleTracker_(sh, t)]),
      [[SH.tasks, styleTasks_], [SH.shop, styleShop_], [SH.dash, styleDashboard_], [SH.stats, styleStats_]]);
  SpreadsheetApp.flush();
  map.forEach(([name, fn]) => { const sh = sheet_(name); if (sh) fn(sh); });
  styleLogs_(logSheet_());
  const tabs = {
    [SH.dash]: '#8ea2ff', [SH.stats]: '#7dd3fc', [SH.habits]: '#4ade80', [SH.rules]: TH.purple, [SH.tasks]: '#60a5fa',
    [SH.shop]: '#facc15', [SH.cfg]: '#6b7280',
  };
  Object.keys(tabs).forEach(n => { const sh = sheet_(n); if (sh) sh.setTabColor(tabs[n]); });
}

/** Dark base for the whole sheet. */
function baseStyle_(sh) {
  const all = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
  all.setBackground(TH.bg).setFontColor(TH.text).setFontFamily(TH.font).setFontSize(10)
    .setFontWeight('normal').setFontStyle('normal').setVerticalAlignment('middle')
    .setBorder(false, false, false, false, false, false);
  sh.setHiddenGridlines(true);
}

function headerStyle_(range) {
  range.setBackground(TH.header).setFontColor(TH.text).setFontWeight('bold').setFontSize(9)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true)
    .setBorder(null, null, true, null, null, null, TH.accent, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

function gridLines_(range) {
  range.setBorder(null, null, null, null, true, true, TH.grid, SpreadsheetApp.BorderStyle.SOLID);
}

/** Fits a column to its text within [min, max]. */
function fitColumn_(sh, col, min, max) {
  sh.autoResizeColumns(col, 1);
  sh.setColumnWidth(col, U.clamp(sh.getColumnWidth(col) + 18, min, max));
}

/** Habit column width from its header (wrapped into 2–3 lines). */
function headerWidth_(text) {
  const s = String(text);
  const longest = Math.max.apply(null, s.split(/\s+/).map(w => w.length));
  return U.clamp(Math.round(Math.max(longest * 7.8, s.length * 7.8 / 2.2) + 22), 84, 150);
}

function cf_() { return SpreadsheetApp.newConditionalFormatRule(); }

// ---------- Settings ----------
function styleSettings_(sh) {
  baseStyle_(sh);
  const n = cfg_().habits.length;
  const helpRows = t_('settings.help').length;
  headerStyle_(sh.getRange(1, 1, 1, 3));
  headerStyle_(sh.getRange(1, 5, 1, 2));
  sh.getRange(2, 1, n, 3).setBackground(TH.surface);
  sh.getRange(2, 2, n, 1).setFontColor(TH.green).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange(2, 3, n, 1).setFontColor(TH.muted).setHorizontalAlignment('center');
  gridLines_(sh.getRange(2, 1, n, 3));
  sh.getRange('E2:F4').setBackground(TH.surface);
  sh.getRange('E2:E4').setFontColor(TH.muted);
  sh.getRange('F2:F4').setFontColor(TH.green).setFontWeight('bold').setHorizontalAlignment('center');
  gridLines_(sh.getRange('E2:F4'));
  sh.getRange('H1').setFontWeight('bold').setFontColor(TH.accent).setFontSize(11);
  if (helpRows > 1) sh.getRange(2, 8, helpRows - 1, 1).setFontColor(TH.muted).setWrap(true);
  const m = cfg_().rules.length;
  const R = SETTINGS_COL.rules;
  headerStyle_(sh.getRange(1, R, 1, 4));
  if (m) {
    sh.getRange(2, R, m, 4).setBackground(TH.surface);
    sh.getRange(2, R + 1, m, 1).setFontColor(TH.purple).setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(2, R + 2, m, 2).setFontColor(TH.muted).setHorizontalAlignment('center');
    gridLines_(sh.getRange(2, R, m, 4));
  }
  fitColumn_(sh, 1, 200, 340);
  sh.setColumnWidth(2, 70); sh.setColumnWidth(3, 110); sh.setColumnWidth(4, 24);
  fitColumn_(sh, 5, 150, 240);
  sh.setColumnWidth(6, 90); sh.setColumnWidth(7, 24); sh.setColumnWidth(8, 460); sh.setColumnWidth(9, 24);
  fitColumn_(sh, R, 200, 340);
  sh.setColumnWidth(R + 1, 70); sh.setColumnWidth(R + 2, 110); sh.setColumnWidth(R + 3, 110);
  sh.setRowHeights(1, sh.getMaxRows(), 26);
  sh.setFrozenRows(1);
}

// ---------- Habits and rules ----------
function styleTracker_(sh, t) {
  const c = trackCols_(t);
  const FR = LAYOUT.FIRST_ROW;
  baseStyle_(sh);
  const rows = Math.max(sh.getMaxRows() - FR + 1, 1);

  headerStyle_(sh.getRange(1, 1, 1, c.width));
  sh.getRange(2, 1, 1, c.width).setBackground(TH.surface).setFontColor(TH.accent).setFontStyle('italic')
    .setFontSize(9).setHorizontalAlignment('center');
  sh.getRange(2, c.first, 1, c.n).setNumberFormat('"+"0" XP"');

  const data = sh.getRange(FR, 1, rows, c.width);
  data.setHorizontalAlignment('center');
  gridLines_(data);
  sh.getRange(FR, 1, rows, 1).setFontColor(TH.muted).setNumberFormat(t_('fmt.dateShort'));
  sh.getRange(FR, 2, rows, 1).setFontColor(TH.dim).setFontSize(9);
  sh.getRange(FR, c.first, rows, c.n).setFontColor(TH.faint);          // empty checkbox color
  sh.getRange(FR, c.xp, rows, 1).setFontWeight('bold').setNumberFormat('0;-0;""');
  sh.getRange(FR, c.pct, rows, 1).setNumberFormat('0%');
  if (c.streak) sh.getRange(FR, c.streak, rows, 1).setFontColor(TH.orange).setFontWeight('bold').setNumberFormat('"🔥 "0;-0;""');
  t.items.forEach((item, j) => {
    if (item.kind === 'avoid') sh.getRange(1, c.first + j).setFontColor(TH.purple);
  });
  sh.getRange(1, c.xp, rows + FR - 1, 1)
    .setBorder(null, true, null, null, null, null, TH.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  sh.setColumnWidth(1, 76); sh.setColumnWidth(2, 40);
  t.items.forEach((h, j) => sh.setColumnWidth(c.first + j, headerWidth_(h.name)));
  sh.setColumnWidth(c.xp, 58); sh.setColumnWidth(c.pct, 92);
  if (c.streak) sh.setColumnWidth(c.streak, 80);
  SpreadsheetApp.flush();
  sh.autoResizeRows(1, 1);
  if (sh.getRowHeight(1) < 52) sh.setRowHeight(1, 52);
  sh.setRowHeight(2, 22);
  sh.setRowHeights(FR, rows, 26);
  sh.setFrozenRows(2);
  sh.setFrozenColumns(2);

  // Conditional formatting: order = priority
  const H = sh.getRange(FR, c.first, rows, c.n);
  const AB = sh.getRange(FR, 1, rows, 2);
  const ALL = sh.getRange(FR, 1, rows, c.width);
  const fc = U.col(c.first) + FR;
  sh.setConditionalFormatRules([
    cf_().whenFormulaSatisfied('=' + fc + '=TRUE').setBackground(TH.greenBg).setFontColor(TH.green).setRanges([H]).build(),
    cf_().whenTextEqualTo('—').setBackground(TH.inactiveBg).setFontColor(TH.inactiveFg).setRanges([H]).build(),
    cf_().whenFormulaSatisfied('=$A' + FR + '=TODAY()').setBackground(TH.accentBg).setFontColor(TH.accent).setRanges([H]).build(),
    cf_().whenFormulaSatisfied('=AND(' + fc + '=FALSE,$A' + FR + '<TODAY())').setBackground(TH.redBg).setFontColor('#7f3b3b').setRanges([H]).build(),
    cf_().whenFormulaSatisfied('=$A' + FR + '=TODAY()').setBackground(TH.accentBg).setFontColor(TH.accent).setBold(true).setRanges([AB]).build(),
    cf_().whenFormulaSatisfied('=$A' + FR + '>TODAY()').setFontColor(TH.faint).setRanges([AB]).build(),
    cf_().whenFormulaSatisfied('=WEEKDAY($A' + FR + ',2)=7').setFontColor(TH.purple).setRanges([AB]).build(),
    cf_().setGradientMinpointWithValue(TH.redDeep, SpreadsheetApp.InterpolationType.NUMBER, '0')
      .setGradientMidpointWithValue('#3d3410', SpreadsheetApp.InterpolationType.NUMBER, '0.5')
      .setGradientMaxpointWithValue(TH.greenDeep, SpreadsheetApp.InterpolationType.NUMBER, '1')
      .setRanges([sh.getRange(FR, c.pct, rows, 1)]).build(),
    cf_().setGradientMinpointWithValue(TH.bg, SpreadsheetApp.InterpolationType.NUMBER, '0')
      .setGradientMaxpoint(TH.greenDeep).setRanges([sh.getRange(FR, c.xp, rows, 1)]).build(),
    cf_().whenFormulaSatisfied('=ISEVEN(ROW())').setBackground(TH.zebra).setRanges([ALL]).build(),
  ]);
}

// ---------- Tasks ----------
function styleTasks_(sh) {
  baseStyle_(sh);
  const rows = sh.getMaxRows() - 1;
  headerStyle_(sh.getRange(1, 1, 1, 9));
  const data = sh.getRange(2, 1, rows, 9);
  gridLines_(data);
  sh.getRange(2, 1, rows, 1).setHorizontalAlignment('center').setFontColor(TH.muted);
  sh.getRange(2, 2, rows, 1).setWrap(true);
  sh.getRange(2, 3, rows, 1).setFontColor(TH.muted).setHorizontalAlignment('center');
  sh.getRange(2, 4, rows, 1).setHorizontalAlignment('center');
  sh.getRange(2, 5, rows, 1).setHorizontalAlignment('center');
  sh.getRange(2, 6, rows, 1).setHorizontalAlignment('center').setFontColor(TH.green).setFontWeight('bold');
  sh.getRange(2, 7, rows, 1).setWrap(true).setFontColor(TH.muted);
  sh.getRange(2, 8, rows, 1).setHorizontalAlignment('center').setFontColor(TH.dim);
  sh.getRange(2, 9, rows, 1).setHorizontalAlignment('center').setFontColor(TH.muted);

  sh.setColumnWidth(1, 44);
  fitColumn_(sh, 2, 300, 560);
  sh.setColumnWidth(3, 120); sh.setColumnWidth(4, 104); sh.setColumnWidth(5, 124);
  sh.setColumnWidth(6, 56);
  fitColumn_(sh, 7, 200, 380);
  sh.setColumnWidth(8, 104); sh.setColumnWidth(9, 150);
  sh.setRowHeight(1, 34);
  SpreadsheetApp.flush();
  sh.autoResizeRows(2, rows);
  sh.setFrozenRows(1);

  const ALL = sh.getRange(2, 1, rows, 9);
  sh.setConditionalFormatRules([
    cf_().whenFormulaSatisfied('=$B2=""').setFontColor(TH.bg).setRanges([sh.getRange(2, 6, rows, 1)]).build(),
    cf_().whenFormulaSatisfied('=AND($A2=TRUE,$B2<>"")').setBackground('#101318').setFontColor(TH.faint).setStrikethrough(true).setRanges([ALL]).build(),
    cf_().whenFormulaSatisfied('=AND($A2=FALSE,$B2<>"",ISNUMBER($D2),$D2<TODAY())').setBackground(TH.redBg).setFontColor('#fecaca').setRanges([ALL]).build(),
    cf_().whenFormulaSatisfied('=AND($A2=FALSE,$B2<>"",ISNUMBER($D2),$D2-TODAY()<=3)').setBackground(TH.yellowBg).setFontColor('#fef08a').setRanges([ALL]).build(),
    cf_().whenTextEqualTo(priorityLabel_('high')).setFontColor(TH.red).setBold(true).setRanges([sh.getRange(2, 5, rows, 1)]).build(),
    cf_().whenFormulaSatisfied('=ISEVEN(ROW())').setBackground(TH.zebra).setRanges([ALL]).build(),
  ]);
}

// ---------- Shop ----------
function styleShop_(sh) {
  baseStyle_(sh);
  const rows = sh.getMaxRows() - 1;
  headerStyle_(sh.getRange(1, 1, 1, 4));
  gridLines_(sh.getRange(2, 1, rows, 4));
  sh.getRange(2, 2, rows, 1).setHorizontalAlignment('center').setFontColor(TH.yellow).setFontWeight('bold');
  sh.getRange(2, 3, rows, 1).setHorizontalAlignment('center').setFontColor(TH.muted);
  sh.getRange(2, 4, rows, 1).setHorizontalAlignment('center').setFontColor(TH.dim);
  fitColumn_(sh, 1, 240, 420);
  sh.setColumnWidth(2, 80); sh.setColumnWidth(3, 80); sh.setColumnWidth(4, 100); sh.setColumnWidth(5, 28);
  sh.setColumnWidth(6, 130); sh.setColumnWidth(7, 110);

  sh.getRange('F1:G3').setBackground(TH.surface)
    .setBorder(true, true, true, true, false, true, TH.border, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange('F1').setFontColor(TH.yellow).setFontWeight('bold').setFontSize(12);
  sh.getRange('G1').setFontColor(TH.yellow).setFontWeight('bold').setFontSize(18).setHorizontalAlignment('center');
  sh.getRange('F2:F3').setFontColor(TH.muted);
  sh.getRange('G2:G3').setFontColor(TH.text).setHorizontalAlignment('center');
  sh.getRange('F5:G9').merge().setWrap(true).setFontColor(TH.dim).setFontStyle('italic').setVerticalAlignment('top');
  sh.setRowHeight(1, 40);
  sh.setFrozenRows(1);
  sh.setConditionalFormatRules([
    cf_().whenFormulaSatisfied('=$C2=TRUE').setFontColor(TH.faint).setStrikethrough(true)
      .setRanges([sh.getRange(2, 1, rows, 4)]).build(),
    cf_().whenFormulaSatisfied('=ISEVEN(ROW())').setBackground(TH.zebra).setRanges([sh.getRange(2, 1, rows, 4)]).build(),
  ]);
}

// ---------- Dashboard ----------
function styleDashboard_(sh) {
  const cfg = cfg_();
  const n = cfg.habits.length;
  const m = cfg.rules.length;
  const rH = rulesHeaderRow_();
  baseStyle_(sh);

  // Grid: gutters A, C, E, G; cards B, D, F; charts on the right (H…)
  [[1, 22], [2, 270], [3, 14], [4, 170], [5, 14], [6, 170], [7, 24]].forEach(([c, w]) => sh.setColumnWidth(c, w));
  for (let col = 8; col <= 23; col++) sh.setColumnWidth(col, 60);
  [24, 25, 26].forEach(col => sh.setColumnWidth(col, 70));

  const heights = { 1: 14, 2: 46, 3: 22, 4: 12, 9: 12, 14: 12, 18: 18, 28: 18 };
  [D.C1, D.C2].forEach(r => { heights[r] = 24; heights[r + 1] = 46; heights[r + 2] = 22; heights[r + 3] = 22; });
  heights[D.C3] = 24; heights[D.C3 + 1] = 46; heights[D.C3 + 2] = 22;
  heights[D.TASKS_H] = 30; heights[D.HAB_H] = 30;
  Object.keys(heights).forEach(r => sh.setRowHeight(Number(r), heights[r]));
  for (let r = D.HAB; r < D.HAB + n; r++) sh.setRowHeight(r, 26);
  if (m) {
    sh.setRowHeight(rH, 30);
    for (let r = rH + 1; r <= rH + m; r++) sh.setRowHeight(r, 26);
  }

  sh.getRange('B2:F2').merge().setFontSize(22).setFontWeight('bold').setFontColor(TH.text);
  sh.getRange('B3:F3').merge().setFontColor(TH.muted).setFontSize(10);

  const card = (col, r0, nrows, valueColor) => {
    const rg = sh.getRange(r0, col, nrows, 1);
    rg.setBackground(TH.surface).setHorizontalAlignment('left')
      .setBorder(true, true, true, true, false, false, TH.border, SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(r0, col).setFontColor(TH.muted).setFontSize(8).setFontWeight('bold');
    sh.getRange(r0 + 1, col).setFontColor(valueColor).setFontSize(24).setFontWeight('bold');
    for (let k = 2; k < nrows; k++) sh.getRange(r0 + k, col).setFontColor(TH.dim).setFontSize(9);
  };
  card(2, D.C1, 4, TH.accent); card(4, D.C1, 4, TH.text); card(6, D.C1, 4, TH.yellow);
  card(2, D.C2, 4, TH.green);  card(4, D.C2, 4, TH.orange); card(6, D.C2, 4, TH.accent);
  card(2, D.C3, 3, TH.red);    card(4, D.C3, 3, TH.yellow); card(6, D.C3, 3, TH.text);
  sh.getRange('B7').setFontColor(TH.purple).setFontSize(11).setFontWeight('bold');
  sh.getRange('F7').setFontColor(TH.yellow).setFontSize(9);

  const section = r => {
    sh.getRange(r, 2, 1, 5).setBorder(null, null, true, null, null, null, TH.border, SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(r, 2).setFontWeight('bold').setFontSize(11).setFontColor(TH.text);
    sh.getRange(r, 4).setFontColor(TH.dim).setFontSize(8).setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(r, 6).setFontColor(TH.dim).setFontSize(8).setFontWeight('bold').setHorizontalAlignment('center');
  };
  section(D.TASKS_H);
  section(D.HAB_H);
  const tEnd = D.TASKS + LAYOUT.TASK_LIST - 1;
  sh.getRange(D.TASKS, 2, LAYOUT.TASK_LIST, 1).setWrap(true).setFontColor(TH.text);
  sh.getRange(D.TASKS, 4, LAYOUT.TASK_LIST, 1).setFontColor(TH.muted).setHorizontalAlignment('center');
  sh.getRange(D.TASKS, 6, LAYOUT.TASK_LIST, 1).setHorizontalAlignment('center');
  gridLines_(sh.getRange(D.TASKS, 2, LAYOUT.TASK_LIST, 5));
  sh.getRange(D.HAB, 2, n, 1).setFontColor(TH.text);
  sh.getRange(D.HAB, 6, n, 1).setHorizontalAlignment('center').setFontWeight('bold');
  gridLines_(sh.getRange(D.HAB, 2, n, 5));
  if (m) {
    section(rH);
    sh.getRange(rH + 1, 2, m, 1).setFontColor(TH.text);
    sh.getRange(rH + 1, 4, m, 1).setHorizontalAlignment('center').setFontColor(TH.orange).setFontWeight('bold');
    sh.getRange(rH + 1, 6, m, 1).setHorizontalAlignment('center').setFontWeight('bold');
    gridLines_(sh.getRange(rH + 1, 2, m, 5));
  }
  SpreadsheetApp.flush();
  sh.autoResizeRows(D.TASKS, LAYOUT.TASK_LIST);

  // Hidden chart data: text color = background color
  sh.getRange(1, 24, sh.getMaxRows(), 3).setFontColor(TH.bg);

  const pctRanges = [sh.getRange(D.HAB, 6, n, 1)].concat(m ? [sh.getRange(rH + 1, 6, m, 1)] : []);
  sh.setConditionalFormatRules([
    cf_().whenNumberLessThan(0).setFontColor(TH.red).setBold(true).setRanges([sh.getRange('F' + D.TASKS + ':F' + tEnd)]).build(),
    cf_().whenNumberLessThanOrEqualTo(3).setFontColor(TH.yellow).setRanges([sh.getRange('F' + D.TASKS + ':F' + tEnd)]).build(),
    cf_().whenNumberGreaterThan(3).setFontColor(TH.green).setRanges([sh.getRange('F' + D.TASKS + ':F' + tEnd)]).build(),
    cf_().whenNumberGreaterThanOrEqualTo(0.8).setFontColor(TH.green).setRanges(pctRanges).build(),
    cf_().whenNumberGreaterThanOrEqualTo(0.5).setFontColor(TH.yellow).setRanges(pctRanges).build(),
    cf_().whenNumberLessThan(0.5).setFontColor(TH.red).setRanges(pctRanges).build(),
    cf_().whenNumberGreaterThan(0).setFontColor(TH.red).setRanges([sh.getRange('B16')]).build(),
    cf_().whenNumberEqualTo(0).setFontColor(TH.green).setRanges([sh.getRange('B16')]).build(),
  ]);

  // Charts are recreated on every styling pass.
  sh.getCharts().forEach(ch => sh.removeChart(ch));
  const axisText = { color: TH.muted, fontSize: 10 };
  sh.insertChart(sh.newChart()
    .setChartType(Charts.ChartType.COMBO)
    .addRange(sh.getRange('X2:Z32'))
    .setNumHeaders(1)
    .setPosition(2, 8, 0, 0)
    .setOption('title', t_('dash.chartXpTitle'))
    .setOption('titleTextStyle', { color: TH.text, fontSize: 14, bold: true })
    .setOption('backgroundColor', TH.surface)
    .setOption('chartArea', { backgroundColor: TH.surface, left: 50, top: 56 })
    .setOption('legend', { position: 'top', textStyle: axisText })
    .setOption('hAxis', { textStyle: axisText, format: t_('fmt.chartDayMonth'), gridlines: { color: 'transparent' } })
    .setOption('vAxes', {
      0: { textStyle: axisText, gridlines: { color: TH.grid }, minValue: 0, title: '' },
      1: { textStyle: axisText, format: 'percent', minValue: 0, maxValue: 1, gridlines: { color: 'transparent' } },
    })
    .setOption('series', {
      0: { type: 'bars', color: TH.green, targetAxisIndex: 0 },
      1: { type: 'line', color: TH.accent, lineWidth: 2, pointSize: 4, targetAxisIndex: 1 },
    })
    .setOption('width', 680)
    .setOption('height', 420)
    .build());

  sh.insertChart(sh.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(sh.getRange('X' + D.CAT_H + ':Y' + (D.CAT_H + cfg.categories.length)))
    .setNumHeaders(1)
    .setPosition(D.TASKS_H, 8, 0, 0)
    .setOption('title', t_('dash.chartCatTitle'))
    .setOption('titleTextStyle', { color: TH.text, fontSize: 14, bold: true })
    .setOption('backgroundColor', TH.surface)
    .setOption('pieHole', 0.55)
    .setOption('pieSliceBorderColor', TH.surface)
    .setOption('pieSliceTextStyle', { color: TH.bg })
    .setOption('legend', { position: 'right', textStyle: axisText })
    .setOption('colors', ['#8ea2ff', '#4ade80', '#facc15', '#fb923c', '#c4b5fd', '#60a5fa', '#f87171'])
    .setOption('width', 680)
    .setOption('height', 320)
    .build());
}

// ═════════════════════════ Protection ═════════════════════════

/** Soft formula protection: Google shows a warning before an edit. */
function protectAll_() {
  const SH = names_();
  const warn = (range, desc) => range.protect().setDescription('DQ: ' + desc).setWarningOnly(true);
  const t = sheet_(SH.tasks), d = sheet_(SH.dash), s = sheet_(SH.shop);
  if (d) d.protect().setDescription('DQ: ' + t_('protect.dashboard')).setWarningOnly(true);
  const st = sheet_(SH.stats);
  if (st) st.protect().setDescription('DQ: ' + t_('protect.stats')).setWarningOnly(true);
  trackers_().forEach(tr => {
    const h = sheet_(tr.sheet);
    if (!h) return;
    const c = trackCols_(tr);
    const body = h.getMaxRows() - LAYOUT.FIRST_ROW + 1;
    warn(h.getRange(1, 1, 2, c.width), t_(tr.key === 'rules' ? 'protect.ruleHeader' : 'protect.habitHeader'));
    warn(h.getRange(LAYOUT.FIRST_ROW, 1, body, 2), t_('protect.dates'));
    warn(h.getRange(LAYOUT.FIRST_ROW, c.xp, body, c.width - c.xp + 1), t_('protect.formulas'));
  });
  if (t) warn(t.getRange(1, 9, t.getMaxRows(), 1), t_('protect.taskLeft'));
  if (s) warn(s.getRange('F1:G3'), t_('protect.balance'));
}
