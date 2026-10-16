/**
 * Styling of the Stats sheet: the 24 px grid, KPI tiles, the heatmap with its legend, and the
 * six charts laid out by pixel (statsAnchor_).
 */

function styleStats_(sh) {
  const rules = tracker_("rules");
  const K = statsCols_();
  const tiles = statsTiles_();
  const G = ST.GRID_FIRST;
  baseStyle_(sh);

  sh.setColumnWidth(1, 20);
  sh.setColumnWidths(G, ST.GRID_COLS, ST.GRID_PX);
  sh.setRowHeights(1, ST.LEGEND + 1, 22);
  sh.setRowHeight(ST.TITLE, 46);
  sh.setRowHeight(ST.TILE_VALUE, 46);
  sh.setRowHeights(ST.HEAT_FIRST, 7, ST.GRID_PX);
  sh.setRowHeights(ST.CHARTS, 140, ST.CHART_ROW_PX);

  sh.getRange(ST.TITLE, G, 1, 30).merge().setFontSize(22).setFontWeight("bold");
  sh.getRange(ST.SUB, G, 1, 30).merge().setFontColor(TH.muted);

  const valueColors = [TH.orange, TH.green, TH.accent, TH.yellow];
  tiles.forEach((c, i) => {
    [ST.TILE_LABEL, ST.TILE_VALUE, ST.TILE_HINT].forEach((r) =>
      sh.getRange(r, c, 1, 12).merge(),
    );
    sh.getRange(ST.TILE_LABEL, c, 3, 12)
      .setBackground(TH.surface)
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
    sh.getRange(ST.TILE_LABEL, c)
      .setFontColor(TH.muted)
      .setFontSize(8)
      .setFontWeight("bold");
    sh.getRange(ST.TILE_VALUE, c)
      .setFontColor(valueColors[i])
      .setFontSize(24)
      .setFontWeight("bold");
    sh.getRange(ST.TILE_HINT, c).setFontColor(TH.dim).setFontSize(9);
  });

  // Heatmap: square cells separated by background-colored borders, colored by value.
  sh.getRange(ST.HEAT_TITLE, G).setFontWeight("bold").setFontSize(11);
  sh.getRange(ST.HEAT_WEEKS_ROW, G + 1, 1, ST.HEAT_WEEKS)
    .setFontColor(TH.dim)
    .setFontSize(8);
  sh.getRange(ST.HEAT_FIRST, G, 7, 1)
    .setFontColor(TH.dim)
    .setFontSize(8)
    .setHorizontalAlignment("center");
  const heat = sh.getRange(ST.HEAT_FIRST, G + 1, 7, ST.HEAT_WEEKS);
  heat
    .setBackground(TH.surface)
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      TH.bg,
      SpreadsheetApp.BorderStyle.SOLID_MEDIUM,
    );
  const legend = [TH.surface, "#14432a", TH.greenDeep, "#22a355", TH.green];
  sh.getRange(ST.LEGEND, G + 3, 1, legend.length)
    .setBackgrounds([legend])
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      TH.bg,
      SpreadsheetApp.BorderStyle.SOLID_MEDIUM,
    );
  sh.getRange(ST.LEGEND, G + 1)
    .setFontColor(TH.dim)
    .setFontSize(8);
  sh.getRange(ST.LEGEND, G + 9)
    .setFontColor(TH.dim)
    .setFontSize(8);
  sh.setConditionalFormatRules([
    cf_()
      .setGradientMinpointWithValue(
        TH.surface,
        SpreadsheetApp.InterpolationType.NUMBER,
        "0",
      )
      .setGradientMidpointWithValue(
        TH.greenDeep,
        SpreadsheetApp.InterpolationType.NUMBER,
        "0.5",
      )
      .setGradientMaxpointWithValue(
        TH.green,
        SpreadsheetApp.InterpolationType.NUMBER,
        "1",
      )
      .setRanges([heat])
      .build(),
  ]);

  // Chart data stays invisible.
  sh.getRange(1, ST.DATA, sh.getMaxRows(), K.last - ST.DATA + 1).setFontColor(
    TH.bg,
  );

  // Charts: a full-width area chart, then rows of two.
  sh.getCharts().forEach((ch) => sh.removeChart(ch));
  const n = cfg_().habits.length,
    m = rules ? rules.items.length : 0;
  const W = 600,
    GAP = 24,
    FULL = 2 * W + GAP;
  const barH = (items) => Math.max(300, 26 * items + 90);
  const range = (c1, c2, rows) => sh.getRange(2, c1, rows + 1, c2 - c1 + 1);
  const weekly = sh.getRange(2, K.weekLabel, 13, 1);
  const routine = tracker_("routine");
  const o = routine ? routine.items.length : 0;
  const weeklyRanges = [weekly, sh.getRange(2, K.wHabits, 13, 1)].concat(
    rules ? [sh.getRange(2, K.wRules, 13, 1)] : [],
    routine ? [sh.getRange(2, K.wRoutine, 13, 1)] : [],
    [sh.getRange(2, K.wTasks, 13, 1)],
  );
  const sourceColors = [TH.green].concat(
    rules ? [TH.purple] : [],
    routine ? [TH.orange] : [],
    ["#60a5fa"],
  );
  const timeColors = [
    TH.accent,
    TH.green,
    TH.yellow,
    TH.orange,
    TH.purple,
    "#60a5fa",
    TH.red,
    TH.muted,
  ];

  const layout = [
    [
      {
        type: Charts.ChartType.AREA,
        ranges: [range(K.date, K.total, ST.ROWS - 2)],
        w: FULL,
        h: 320,
        title: t_("stats.chartTotal"),
        opts: {
          colors: [TH.accent],
          legend: { position: "none" },
          hAxis: { format: t_("fmt.chartDayMonth") },
          areaOpacity: 0.25,
          lineWidth: 2,
        },
      },
    ],
    [
      {
        type: Charts.ChartType.COLUMN,
        ranges: weeklyRanges,
        w: W,
        h: 320,
        title: t_("stats.chartWeekly"),
        opts: { isStacked: true, colors: sourceColors },
      },
      {
        type: Charts.ChartType.PIE,
        ranges: [range(K.source, K.sourceXp, sourceColors.length)],
        w: W,
        h: 320,
        title: t_("stats.chartSource"),
        opts: {
          pieHole: 0.55,
          colors: sourceColors,
          pieSliceBorderColor: TH.surface,
          pieSliceTextStyle: { color: TH.bg },
          legend: { position: "right" },
        },
      },
    ],
    [
      {
        type: Charts.ChartType.BAR,
        ranges: [range(K.habitName, K.habitRate, n)],
        w: W,
        h: barH(Math.max(n, m)),
        title: t_("stats.chartHabits"),
        opts: percentBars_(TH.green),
      },
    ].concat(
      rules
        ? [
            {
              type: Charts.ChartType.BAR,
              ranges: [range(K.ruleName, K.ruleRate, m)],
              w: W,
              h: barH(Math.max(n, m)),
              title: t_("stats.chartRules"),
              opts: percentBars_(TH.purple),
            },
          ]
        : [],
    ),
    [
      {
        type: Charts.ChartType.COLUMN,
        ranges: [range(K.weekday, rules ? K.wdRules : K.wdHabits, 7)],
        w: W,
        h: 300,
        title: t_("stats.chartWeekday"),
        opts: {
          colors: [TH.green, TH.purple],
          vAxis: { format: "percent", minValue: 0, maxValue: 1 },
        },
      },
    ],
    [
      {
        type: Charts.ChartType.PIE,
        ranges: [range(K.timeAct, K.timeHours, 38)],
        w: W,
        h: 360,
        title: t_("stats.chartTime"),
        opts: {
          pieHole: 0.55,
          colors: timeColors,
          pieSliceBorderColor: TH.surface,
          pieSliceTextStyle: { color: TH.bg },
          legend: { position: "right" },
        },
      },
    ].concat(
      routine
        ? [
            {
              type: Charts.ChartType.BAR,
              ranges: [range(K.routineName, K.routineRate, o)],
              w: W,
              h: Math.max(360, barH(o)),
              title: t_("stats.chartRoutine"),
              opts: percentBars_(TH.orange),
            },
          ]
        : [],
    ),
  ];

  let y = 0;
  layout.forEach((row) => {
    let x = 0;
    row.forEach((spec) => {
      const [colA, offA] = statsAnchor_(x);
      const row0 = ST.CHARTS + Math.floor(y / ST.CHART_ROW_PX);
      // Charts are decoration: one rejected chart must not abort the whole rebuild.
      try {
        insertDarkChart_(sh, spec, row0, colA, offA);
      } catch (e) {
        console.error(
          "Stats chart «" + spec.title + "»",
          e && e.stack ? e.stack : e,
        );
        notify_("⚠️ " + spec.title + ": " + e.message, 10);
      }
      x += spec.w + GAP;
    });
    y +=
      Math.max.apply(
        null,
        row.map((s) => s.h),
      ) + GAP;
  });
}
