/**
 * The Stats sheet: KPI tiles, a 26-week completion heatmap and six charts, all driven by live
 * formulas over the tracker, task and shop sheets (the sheet holds no user data).
 *
 * Layout: columns B…AZ are a uniform 24 px grid, so heatmap cells are square and charts can be
 * placed by pixel (statsAnchor_). Chart data lives in columns BC onwards, text colored like the
 * background.
 */

const ST = {
  GRID_PX: 24,
  GRID_FIRST: 2,
  GRID_COLS: 52, // B…BA
  TITLE: 2,
  SUB: 3,
  TILE_LABEL: 5,
  TILE_VALUE: 6,
  TILE_HINT: 7,
  HEAT_TITLE: 9,
  HEAT_WEEKS_ROW: 10,
  HEAT_FIRST: 11,
  HEAT_WEEKS: 26,
  LEGEND: 19,
  CHARTS: 21,
  CHART_ROW_PX: 20,
  DATA: 55, // column BC
  ROWS: 1202, // room for the daily series (up to 1200 days)
};

/** Pixel x offset from the left edge of column B → [anchor column, offset inside it]. */
function statsAnchor_(x) {
  return [ST.GRID_FIRST + Math.floor(x / ST.GRID_PX), x % ST.GRID_PX];
}

function statsCols_() {
  const d = ST.DATA;
  return {
    date: d,
    total: d + 1, // daily series
    weekStart: d + 3,
    weekLabel: d + 4,
    wHabits: d + 5,
    wRules: d + 6,
    wTasks: d + 7,
    habitName: d + 9,
    habitRate: d + 10,
    ruleName: d + 12,
    ruleRate: d + 13,
    weekday: d + 15,
    wdHabits: d + 16,
    wdRules: d + 17,
    source: d + 19,
    sourceXp: d + 20,
    heatStart: d + 22,
    last: d + 22,
  };
}

function buildStats_(sh) {
  const SH = names_();
  const habits = tracker_("habits");
  const rules = tracker_("rules");
  const hc = trackCols_(habits);
  const rc = rules ? trackCols_(rules) : null;
  const K = statsCols_();
  const L = U.col;
  const FR = LAYOUT.FIRST_ROW;
  trimSheet_(sh, ST.ROWS, K.last + 1);

  const hS = U.q(SH.habits),
    tS = U.q(SH.tasks),
    cS = U.q(SH.cfg),
    dS = U.q(SH.dash);
  const rS = rules ? U.q(rules.sheet) : "";
  const col = (sheetQ, c) => sheetQ + "!" + L(c) + FR + ":" + L(c);
  const hA = col(hS, 1),
    hB = col(hS, 2),
    hXp = col(hS, hc.xp),
    hPct = col(hS, hc.pct);
  const rA = rules ? col(rS, 1) : "",
    rXp = rules ? col(rS, rc.xp) : "";
  const tDone = tS + "!H2:H",
    tXp = tS + "!F2:F";
  const upToToday = (a) => a + ',"<="&TODAY()';
  const last30 = (a) => a + ',">"&(TODAY()-30),' + a + ',"<="&TODAY()';
  const cells = {};
  const put = (c, r, v) => {
    cells[L(c) + r] = v;
  };

  // Title and KPI tiles
  cells["B" + ST.TITLE] = t_("stats.title");
  cells["B" + ST.SUB] = t_("stats.subtitle");
  const tiles = statsTiles_();
  const tileValues = [
    [
      "stats.bestStreak",
      "=MAX(0," + col(hS, hc.streak) + ")",
      "=" + tq_("stats.current") + "&" + dS + "!D11&" + tq_("dash.subDays"),
    ],
    [
      "stats.perfectDays",
      "=COUNTIFS(" + hPct + ',">=1",' + upToToday(hA) + ")",
      t_("stats.perfectHint"),
    ],
    [
      "stats.ticks",
      "=COUNTIF(" +
        hS +
        "!" +
        L(hc.first) +
        FR +
        ":" +
        L(hc.last) +
        ",TRUE)" +
        (rules
          ? "+COUNTIF(" +
            rS +
            "!" +
            L(rc.first) +
            FR +
            ":" +
            L(rc.last) +
            ",TRUE)"
          : ""),
      t_("stats.ticksHint"),
    ],
    [
      "stats.avg30",
      "=IFERROR(AVERAGEIFS(" + hPct + "," + last30(hA) + "),0)",
      "=IFERROR(SPARKLINE(FILTER(" +
        hPct +
        "," +
        hA +
        ">TODAY()-30," +
        hA +
        "<=TODAY())," +
        '{"charttype","column";"color","' +
        TH.green +
        '";"ymin",0;"ymax",1}),"")',
    ],
  ];
  tiles.forEach((first, i) => {
    put(first, ST.TILE_LABEL, t_(tileValues[i][0]));
    put(first, ST.TILE_VALUE, tileValues[i][1]);
    put(first, ST.TILE_HINT, tileValues[i][2]);
  });

  // Heatmap: one column per week (oldest left), one row per weekday; value = habit completion.
  const heatStart = "$" + L(K.heatStart) + "$3";
  put(K.heatStart, 2, t_("stats.week"));
  put(K.heatStart, 3, "=TODAY()-WEEKDAY(TODAY(),2)+1-7*" + (ST.HEAT_WEEKS - 1));
  cells["B" + ST.HEAT_TITLE] = t_("stats.heatmap");
  const weekdays = t_("weekdays");
  for (let d = 0; d < 7; d++) {
    put(ST.GRID_FIRST, ST.HEAT_FIRST + d, weekdays[d]);
    for (let w = 0; w < ST.HEAT_WEEKS; w++) {
      const day = heatStart + "+" + (7 * w + d);
      put(
        ST.GRID_FIRST + 1 + w,
        ST.HEAT_FIRST + d,
        "=IF(" +
          day +
          '>TODAY(),"",IFERROR(VLOOKUP(' +
          day +
          "," +
          hS +
          "!$A$" +
          FR +
          ":$" +
          L(hc.pct) +
          "," +
          hc.pct +
          ',FALSE),""))',
      );
    }
  }
  for (let w = 0; w < ST.HEAT_WEEKS; w += 4) {
    put(
      ST.GRID_FIRST + 1 + w,
      ST.HEAT_WEEKS_ROW,
      "=TEXT(" + heatStart + "+" + 7 * w + ',"' + t_("fmt.dayMonth") + '")',
    );
  }
  put(ST.GRID_FIRST + 1, ST.LEGEND, t_("stats.less"));
  put(ST.GRID_FIRST + 9, ST.LEGEND, t_("stats.more"));

  // Daily series: total XP up to each day. SUMIF (not SUMIFS) because only SUMIF expands
  // inside ARRAYFORMULA in Google Sheets.
  const days =
    "FILTER(" +
    L(K.date) +
    "3:" +
    L(K.date) +
    ",ISNUMBER(" +
    L(K.date) +
    "3:" +
    L(K.date) +
    "))";
  const sumTo = (range, xp) =>
    "SUMIF(" + range + ',"<="&' + days + "," + xp + ")";
  put(K.date, 2, t_("stats.date"));
  put(K.total, 2, t_("stats.totalXp"));
  put(
    K.date,
    3,
    "=IFERROR(FILTER(" + hA + ",ISNUMBER(" + hA + ")," + hA + '<=TODAY()),"")',
  );
  put(
    K.total,
    3,
    "=IFERROR(ARRAYFORMULA(" +
      sumTo(hA, hXp) +
      (rules ? "+" + sumTo(rA, rXp) : "") +
      "+" +
      sumTo(tDone, tXp) +
      '),"")',
  );

  // XP per week by source, last 12 weeks
  const wk = L(K.weekStart) + "3:" + L(K.weekStart) + "14";
  const inWeek = (range, xp) =>
    "ARRAYFORMULA(SUMIF(" +
    range +
    ',"<"&(' +
    wk +
    "+7)," +
    xp +
    ")-SUMIF(" +
    range +
    ',"<"&' +
    wk +
    "," +
    xp +
    "))";
  put(K.weekStart, 2, t_("stats.week"));
  put(K.weekLabel, 2, t_("stats.week"));
  put(K.wHabits, 2, t_("stats.habits"));
  put(K.wRules, 2, t_("stats.rules"));
  put(K.wTasks, 2, t_("stats.tasks"));
  put(
    K.weekStart,
    3,
    "=ARRAYFORMULA(TODAY()-WEEKDAY(TODAY(),2)+1-7*(12-SEQUENCE(12)))",
  );
  put(
    K.weekLabel,
    3,
    "=ARRAYFORMULA(TEXT(" + wk + ',"' + t_("fmt.dayMonth") + '"))',
  );
  put(K.wHabits, 3, "=" + inWeek(hA, hXp));
  put(
    K.wRules,
    3,
    rules ? "=" + inWeek(rA, rXp) : "=ARRAYFORMULA(0*SEQUENCE(12))",
  );
  put(K.wTasks, 3, "=" + inWeek(tDone, tXp));

  // Completion over the last 30 days, per habit and per rule
  const rateRows = (t, c, nameCol, rateCol, settingsCol, header) => {
    const sq = U.q(t.sheet);
    const win =
      sq +
      "!$A$" +
      FR +
      ':$A,">"&(TODAY()-30),' +
      sq +
      "!$A$" +
      FR +
      ':$A,"<="&TODAY()';
    put(nameCol, 2, header);
    put(rateCol, 2, t_("stats.share"));
    t.items.forEach((item, i) => {
      const range = sq + "!" + L(c.first + i) + "$" + FR + ":" + L(c.first + i);
      const yes = "COUNTIFS(" + range + ",TRUE," + win + ")";
      const no = "COUNTIFS(" + range + ",FALSE," + win + ")";
      put(nameCol, 3 + i, "=" + cS + "!" + L(settingsCol) + (i + 2));
      put(rateCol, 3 + i, "=IFERROR(" + yes + "/(" + yes + "+" + no + "),0)");
    });
  };
  rateRows(
    habits,
    hc,
    K.habitName,
    K.habitRate,
    SETTINGS_COL.habits,
    t_("stats.habits"),
  );
  if (rules)
    rateRows(
      rules,
      rc,
      K.ruleName,
      K.ruleRate,
      SETTINGS_COL.rules,
      t_("stats.rules"),
    );

  // Average completion by weekday (days up to today)
  put(K.weekday, 2, t_("stats.weekday"));
  put(K.wdHabits, 2, t_("stats.habits"));
  if (rules) put(K.wdRules, 2, t_("stats.rules"));
  weekdays.forEach((name, i) => {
    const label = L(K.weekday) + (3 + i);
    put(K.weekday, 3 + i, name);
    put(
      K.wdHabits,
      3 + i,
      "=IFERROR(AVERAGEIFS(" +
        hPct +
        "," +
        hB +
        "," +
        label +
        "," +
        upToToday(hA) +
        "),0)",
    );
    if (rules) {
      put(
        K.wdRules,
        3 + i,
        "=IFERROR(AVERAGEIFS(" +
          col(rS, rc.pct) +
          "," +
          col(rS, 2) +
          "," +
          label +
          "," +
          upToToday(rA) +
          "),0)",
      );
    }
  });

  // XP by source, all time
  put(K.source, 2, t_("stats.source"));
  put(K.sourceXp, 2, t_("stats.xp"));
  const sources = [
    [t_("stats.habits"), "=SUM(" + hXp + ")"],
    [t_("stats.tasks"), "=SUMIF(" + tS + "!A2:A,TRUE," + tXp + ")"],
  ];
  if (rules) sources.splice(1, 0, [t_("stats.rules"), "=SUM(" + rXp + ")"]);
  sources.forEach(([name, f], i) => {
    put(K.source, 3 + i, name);
    put(K.sourceXp, 3 + i, f);
  });

  writeCells_(sh, cells);

  sh.getRange(ST.TILE_VALUE, tiles[3]).setNumberFormat("0%");
  sh.getRange(ST.TILE_VALUE, tiles[0]).setNumberFormat(t_("fmt.streakDays"));
  sh.getRange(
    ST.HEAT_FIRST,
    ST.GRID_FIRST + 1,
    7,
    ST.HEAT_WEEKS,
  ).setNumberFormat(";;;");
  sh.getRange(3, K.date, ST.ROWS - 2, 1).setNumberFormat(t_("fmt.date"));
}

/** First grid column of each of the four KPI tiles (12 columns wide, one column apart). */
function statsTiles_() {
  return [0, 1, 2, 3].map((i) => ST.GRID_FIRST + i * 13);
}

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
  const weeklyRanges = [weekly, sh.getRange(2, K.wHabits, 13, 1)].concat(
    rules ? [sh.getRange(2, K.wRules, 13, 1)] : [],
    [sh.getRange(2, K.wTasks, 13, 1)],
  );
  const sourceColors = [TH.green].concat(rules ? [TH.purple] : [], ["#60a5fa"]);

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
        ranges: [range(K.source, K.sourceXp, rules ? 3 : 2)],
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

function percentBars_(color) {
  return {
    colors: [color],
    legend: { position: "none" },
    hAxis: { format: "percent", minValue: 0, maxValue: 1 },
  };
}

/** One chart in the house dark style; `spec` = { type, ranges, w, h, title, opts }. */
function insertDarkChart_(sh, spec, row, col, offsetX) {
  const axisText = { color: TH.muted, fontSize: 10 };
  const opts = spec.opts || {};
  const b = sh
    .newChart()
    .setChartType(spec.type)
    .setNumHeaders(1)
    .setPosition(row, col, offsetX, 0)
    .setOption("title", spec.title)
    .setOption("titleTextStyle", { color: TH.text, fontSize: 14, bold: true })
    .setOption("backgroundColor", TH.surface)
    .setOption("chartArea", { backgroundColor: TH.surface, left: 60, top: 56 })
    .setOption("legend", { position: "top", textStyle: axisText })
    .setOption(
      "hAxis",
      Object.assign(
        { textStyle: axisText, gridlines: { color: TH.grid } },
        opts.hAxis || {},
      ),
    )
    .setOption(
      "vAxis",
      Object.assign(
        { textStyle: axisText, gridlines: { color: TH.grid } },
        opts.vAxis || {},
      ),
    )
    .setOption("width", spec.w)
    .setOption("height", spec.h);
  spec.ranges.forEach((r) => b.addRange(r));
  Object.keys(opts).forEach((k) => {
    if (k === "hAxis" || k === "vAxis") return;
    b.setOption(
      k,
      k === "legend"
        ? Object.assign({ textStyle: axisText }, opts[k])
        : opts[k],
    );
  });
  sh.insertChart(b.build());
}
