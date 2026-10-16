/**
 * Styling of the Dashboard sheet: card grid, sections, conditional colors and its two charts.
 */

function styleDashboard_(sh) {
  const cfg = cfg_();
  const n = cfg.habits.length;
  const m = cfg.rules.length;
  const rH = rulesHeaderRow_();
  baseStyle_(sh);

  // Grid: gutters A, C, E, G; cards B, D, F; charts on the right (H…)
  [
    [1, 22],
    [2, 270],
    [3, 14],
    [4, 170],
    [5, 14],
    [6, 170],
    [7, 24],
  ].forEach(([c, w]) => sh.setColumnWidth(c, w));
  for (let col = 8; col <= 23; col++) sh.setColumnWidth(col, 60);
  [24, 25, 26].forEach((col) => sh.setColumnWidth(col, 70));

  const heights = { 1: 14, 2: 46, 3: 22, 4: 22, 9: 12, 14: 12, 18: 18, 28: 18 };
  [D.C1, D.C2].forEach((r) => {
    heights[r] = 24;
    heights[r + 1] = 46;
    heights[r + 2] = 22;
    heights[r + 3] = 22;
  });
  heights[D.C3] = 24;
  heights[D.C3 + 1] = 46;
  heights[D.C3 + 2] = 22;
  heights[D.TASKS_H] = 30;
  heights[D.HAB_H] = 30;
  Object.keys(heights).forEach((r) => sh.setRowHeight(Number(r), heights[r]));
  for (let r = D.HAB; r < D.HAB + n; r++) sh.setRowHeight(r, 26);
  if (m) {
    sh.setRowHeight(rH, 30);
    for (let r = rH + 1; r <= rH + m; r++) sh.setRowHeight(r, 26);
  }

  sh.getRange("B2:F2")
    .merge()
    .setFontSize(22)
    .setFontWeight("bold")
    .setFontColor(TH.text);
  sh.getRange("B4:F4").merge().setFontColor(TH.accent).setFontSize(10);
  sh.getRange("B3:F3").merge().setFontColor(TH.muted).setFontSize(10);

  const card = (col, r0, nrows, valueColor) => {
    const rg = sh.getRange(r0, col, nrows, 1);
    rg.setBackground(TH.surface)
      .setHorizontalAlignment("left")
      .setBorder(
        true,
        true,
        true,
        true,
        false,
        false,
        TH.border,
        SpreadsheetApp.BorderStyle.SOLID,
      );
    sh.getRange(r0, col)
      .setFontColor(TH.muted)
      .setFontSize(8)
      .setFontWeight("bold");
    sh.getRange(r0 + 1, col)
      .setFontColor(valueColor)
      .setFontSize(24)
      .setFontWeight("bold");
    for (let k = 2; k < nrows; k++)
      sh.getRange(r0 + k, col)
        .setFontColor(TH.dim)
        .setFontSize(9);
  };
  card(2, D.C1, 4, TH.accent);
  card(4, D.C1, 4, TH.text);
  card(6, D.C1, 4, TH.yellow);
  card(2, D.C2, 4, TH.green);
  card(4, D.C2, 4, TH.orange);
  card(6, D.C2, 4, TH.accent);
  card(2, D.C3, 3, TH.red);
  card(4, D.C3, 3, TH.yellow);
  card(6, D.C3, 3, TH.text);
  sh.getRange("B7")
    .setFontColor(TH.purple)
    .setFontSize(11)
    .setFontWeight("bold");
  sh.getRange("F7").setFontColor(TH.yellow).setFontSize(9);

  const section = (r) => {
    sh.getRange(r, 2, 1, 5).setBorder(
      null,
      null,
      true,
      null,
      null,
      null,
      TH.border,
      SpreadsheetApp.BorderStyle.SOLID,
    );
    sh.getRange(r, 2)
      .setFontWeight("bold")
      .setFontSize(11)
      .setFontColor(TH.text);
    sh.getRange(r, 4)
      .setFontColor(TH.dim)
      .setFontSize(8)
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sh.getRange(r, 6)
      .setFontColor(TH.dim)
      .setFontSize(8)
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
  };
  section(D.TASKS_H);
  section(D.HAB_H);
  const tEnd = D.TASKS + LAYOUT.TASK_LIST - 1;
  sh.getRange(D.TASKS, 2, LAYOUT.TASK_LIST, 1)
    .setWrap(true)
    .setFontColor(TH.text);
  sh.getRange(D.TASKS, 4, LAYOUT.TASK_LIST, 1)
    .setFontColor(TH.muted)
    .setHorizontalAlignment("center");
  sh.getRange(D.TASKS, 6, LAYOUT.TASK_LIST, 1).setHorizontalAlignment("center");
  gridLines_(sh.getRange(D.TASKS, 2, LAYOUT.TASK_LIST, 5));
  sh.getRange(D.HAB, 2, n, 1).setFontColor(TH.text);
  sh.getRange(D.HAB, 6, n, 1)
    .setHorizontalAlignment("center")
    .setFontWeight("bold");
  gridLines_(sh.getRange(D.HAB, 2, n, 5));
  if (m) {
    section(rH);
    sh.getRange(rH + 1, 2, m, 1).setFontColor(TH.text);
    sh.getRange(rH + 1, 4, m, 1)
      .setHorizontalAlignment("center")
      .setFontColor(TH.orange)
      .setFontWeight("bold");
    sh.getRange(rH + 1, 6, m, 1)
      .setHorizontalAlignment("center")
      .setFontWeight("bold");
    gridLines_(sh.getRange(rH + 1, 2, m, 5));
  }
  SpreadsheetApp.flush();
  sh.autoResizeRows(D.TASKS, LAYOUT.TASK_LIST);

  // Hidden chart data: text color = background color
  sh.getRange(1, 24, sh.getMaxRows(), 3).setFontColor(TH.bg);

  const pctRanges = [sh.getRange(D.HAB, 6, n, 1)].concat(
    m ? [sh.getRange(rH + 1, 6, m, 1)] : [],
  );
  sh.setConditionalFormatRules([
    cf_()
      .whenNumberLessThan(0)
      .setFontColor(TH.red)
      .setBold(true)
      .setRanges([sh.getRange("F" + D.TASKS + ":F" + tEnd)])
      .build(),
    cf_()
      .whenNumberLessThanOrEqualTo(3)
      .setFontColor(TH.yellow)
      .setRanges([sh.getRange("F" + D.TASKS + ":F" + tEnd)])
      .build(),
    cf_()
      .whenNumberGreaterThan(3)
      .setFontColor(TH.green)
      .setRanges([sh.getRange("F" + D.TASKS + ":F" + tEnd)])
      .build(),
    cf_()
      .whenNumberGreaterThanOrEqualTo(0.8)
      .setFontColor(TH.green)
      .setRanges(pctRanges)
      .build(),
    cf_()
      .whenNumberGreaterThanOrEqualTo(0.5)
      .setFontColor(TH.yellow)
      .setRanges(pctRanges)
      .build(),
    cf_()
      .whenNumberLessThan(0.5)
      .setFontColor(TH.red)
      .setRanges(pctRanges)
      .build(),
    cf_()
      .whenNumberGreaterThan(0)
      .setFontColor(TH.red)
      .setRanges([sh.getRange("B16")])
      .build(),
    cf_()
      .whenNumberEqualTo(0)
      .setFontColor(TH.green)
      .setRanges([sh.getRange("B16")])
      .build(),
  ]);

  // Charts are recreated on every styling pass.
  sh.getCharts().forEach((ch) => sh.removeChart(ch));
  const axisText = { color: TH.muted, fontSize: 10 };
  sh.insertChart(
    sh
      .newChart()
      .setChartType(Charts.ChartType.COMBO)
      .addRange(sh.getRange("X2:Z32"))
      .setNumHeaders(1)
      .setPosition(2, 8, 0, 0)
      .setOption("title", t_("dash.chartXpTitle"))
      .setOption("titleTextStyle", { color: TH.text, fontSize: 14, bold: true })
      .setOption("backgroundColor", TH.surface)
      .setOption("chartArea", {
        backgroundColor: TH.surface,
        left: 50,
        top: 56,
      })
      .setOption("legend", { position: "top", textStyle: axisText })
      .setOption("hAxis", {
        textStyle: axisText,
        format: t_("fmt.chartDayMonth"),
        gridlines: { color: "transparent" },
      })
      .setOption("vAxes", {
        0: {
          textStyle: axisText,
          gridlines: { color: TH.grid },
          minValue: 0,
          title: "",
        },
        1: {
          textStyle: axisText,
          format: "percent",
          minValue: 0,
          maxValue: 1,
          gridlines: { color: "transparent" },
        },
      })
      .setOption("series", {
        0: { type: "bars", color: TH.green, targetAxisIndex: 0 },
        1: {
          type: "line",
          color: TH.accent,
          lineWidth: 2,
          pointSize: 4,
          targetAxisIndex: 1,
        },
      })
      .setOption("width", 680)
      .setOption("height", 420)
      .build(),
  );

  sh.insertChart(
    sh
      .newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(
        sh.getRange("X" + D.CAT_H + ":Y" + (D.CAT_H + cfg.categories.length)),
      )
      .setNumHeaders(1)
      .setPosition(D.TASKS_H, 8, 0, 0)
      .setOption("title", t_("dash.chartCatTitle"))
      .setOption("titleTextStyle", { color: TH.text, fontSize: 14, bold: true })
      .setOption("backgroundColor", TH.surface)
      .setOption("pieHole", 0.55)
      .setOption("pieSliceBorderColor", TH.surface)
      .setOption("pieSliceTextStyle", { color: TH.bg })
      .setOption("legend", { position: "right", textStyle: axisText })
      .setOption("colors", [
        "#8ea2ff",
        "#4ade80",
        "#facc15",
        "#fb923c",
        "#c4b5fd",
        "#60a5fa",
        "#f87171",
      ])
      .setOption("width", 680)
      .setOption("height", 320)
      .build(),
  );
}
