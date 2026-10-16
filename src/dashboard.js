/**
 * The Dashboard sheet: cards (level, XP, coins, today, streak, tasks), next tasks, 30-day habit
 * and rule stats, and two charts fed by hidden data in columns X:Z.
 */

function buildDashboard_(sh) {
  const cfg = cfg_();
  const SH = names_();
  const c = habitCols_();
  const n = cfg.habits.length;
  const rules = tracker_("rules");
  const m = rules ? rules.items.length : 0;
  const rH = rulesHeaderRow_();
  trimSheet_(sh, Math.max(rH + m + 2, D.CAT_H + cfg.categories.length + 2), 26);

  const hS = U.q(SH.habits),
    tS = U.q(SH.tasks),
    sS = U.q(SH.shop),
    cS = U.q(SH.cfg);
  const xpL = U.col(c.xp),
    pctL = U.col(c.pct),
    stL = U.col(c.streak);
  const FR = LAYOUT.FIRST_ROW;
  const atIn = (sheetQ, col, day) =>
    "IFERROR(INDEX(" +
    sheetQ +
    "!" +
    col +
    ":" +
    col +
    ",MATCH(" +
    day +
    "," +
    sheetQ +
    "!A:A,0)),0)";
  const at = (col, day) => atIn(hS, col, day);
  const rc = rules ? trackCols_(rules) : null;
  const rS = rules ? U.q(rules.sheet) : "";
  // Every tracker besides habits (rules, routine) adds its XP to the totals.
  const extras = trackers_()
    .filter((t) => t.key !== "habits")
    .map((t) => {
      const tc = trackCols_(t);
      return { S: U.q(t.sheet), c: tc, xpL: U.col(tc.xp), pctL: U.col(tc.pct) };
    });
  const plusExtras = (fn) => extras.map((e) => "+" + fn(e)).join("");
  const todayPct = "N(" + at(pctL, "TODAY()") + ")";
  const per = cS + "!$F$2",
    coin = cS + "!$F$3",
    thr = cS + "!$F$4";
  const spent = "SUMIF(" + sS + "!C2:C,TRUE," + sS + "!B2:B)";
  // Task XP counts only for ticked rows with a title (empty rows carry a default XP).
  const taskXp =
    "SUMIFS(" + tS + "!F2:F," + tS + "!A2:A,TRUE," + tS + '!B2:B,"<>")';
  // XP of tasks completed in [from, to) by their completion date (column H).
  const taskXpIn = (from, to) =>
    "SUMIFS(" +
    tS +
    "!F2:F," +
    tS +
    "!A2:A,TRUE," +
    tS +
    '!B2:B,"<>",' +
    tS +
    '!H2:H,">="&' +
    from +
    "," +
    tS +
    '!H2:H,"<"&' +
    to +
    ")";
  const earned = "FLOOR(D6*" + coin + ")";
  const last7 = hS + '!A:A,"<="&TODAY(),' + hS + '!A:A,">"&(TODAY()-7)';
  const shopGid = sheet_(SH.shop).getSheetId();
  const taskGid = sheet_(SH.tasks).getSheetId();
  const habGid = sheet_(SH.habits).getSheetId();
  const cond = tS + "!A2:A=FALSE," + tS + '!B2:B<>"",ISNUMBER(' + tS + "!D2:D)";
  const ranks = quoteList_(t_("ranks"));
  const nRanks = t_("ranks").length;
  const dateFmt = tq_("fmt.date");

  const cells = {
    B2: t_("dash.title"),
    B4:
      "=" +
      tq_("dash.now") +
      "&" +
      U.q(SH.schedule) +
      "!" +
      U.col(SCHEDULE.SUM + 1) +
      "4&" +
      tq_("dash.next") +
      "&" +
      U.q(SH.schedule) +
      "!" +
      U.col(SCHEDULE.SUM + 1) +
      "5",
    B3:
      "=" +
      tq_("dash.subLevel") +
      '&B6&" · "&B7&" · "&TEXT(TODAY(),' +
      dateFmt +
      ")&" +
      tq_("dash.subStreak") +
      "&D11&" +
      tq_("dash.subDays"),

    B5: t_("dash.level"),
    D5: t_("dash.totalXp"),
    F5: t_("dash.coins"),
    B6: "=INT(D6/" + per + ")+1",
    D6:
      "=SUM(" +
      hS +
      "!" +
      xpL +
      FR +
      ":" +
      xpL +
      ")" +
      plusExtras((e) => "SUM(" + e.S + "!" + e.xpL + FR + ":" + e.xpL + ")") +
      "+" +
      taskXp,
    F6: "=" + earned + "-" + spent,
    B7: "=CHOOSE(MIN(B6," + nRanks + ")," + ranks + ")",
    D7:
      "=SPARKLINE(MOD(D6," +
      per +
      '),{"charttype","bar";"max",' +
      per +
      ';"color1","' +
      TH.green +
      '"})',
    F7: '=HYPERLINK("#gid=' + shopGid + '",' + tq_("dash.openShop") + ")",
    B8:
      "=" +
      tq_("dash.toLevel") +
      '&(B6+1)&": "&(' +
      per +
      "-MOD(D6," +
      per +
      '))&" XP"',
    D8: "=MOD(D6," + per + ')&" / "&' + per + "&" + tq_("dash.onLevel"),
    F8:
      "=" +
      tq_("dash.earned") +
      "&" +
      earned +
      "&" +
      tq_("dash.spent") +
      "&" +
      spent,

    B10: t_("dash.todayXp"),
    D10: t_("dash.streakDays"),
    F10: t_("dash.avg7"),
    B11:
      "=" +
      at(xpL, "TODAY()") +
      plusExtras((e) => atIn(e.S, e.xpL, "TODAY()")) +
      "+" +
      taskXpIn("TODAY()", "(TODAY()+1)"),
    D11: "=MAX(N(" + at(stL, "TODAY()") + "),N(" + at(stL, "TODAY()-1") + "))",
    F11:
      "=IFERROR(AVERAGEIFS(" +
      hS +
      "!" +
      pctL +
      ":" +
      pctL +
      "," +
      last7 +
      "),0)",
    B12:
      "=SPARKLINE(" +
      todayPct +
      ',{"charttype","bar";"max",1;"color1","' +
      TH.green +
      '"})',
    D12: "=" + tq_("dash.streakRule") + "&TEXT(" + thr + ',"0%")',
    F12:
      '=SPARKLINE(F11,{"charttype","bar";"max",1;"color1","' +
      TH.accent +
      '"})',
    B13: "=TEXT(" + todayPct + ',"0%")&' + tq_("dash.habitsToday"),
    D13:
      "=" +
      tq_("dash.record") +
      "&MAX(" +
      hS +
      "!" +
      stL +
      FR +
      ":" +
      stL +
      ")&" +
      tq_("dash.subDays"),
    F13:
      "=" +
      tq_("dash.weekXp") +
      "&(SUMIFS(" +
      hS +
      "!" +
      xpL +
      ":" +
      xpL +
      "," +
      last7 +
      ")" +
      plusExtras(
        (e) =>
          "SUMIFS(" +
          e.S +
          "!" +
          e.xpL +
          ":" +
          e.xpL +
          "," +
          e.S +
          '!A:A,"<="&TODAY(),' +
          e.S +
          '!A:A,">"&(TODAY()-7))',
      ) +
      "+" +
      taskXpIn("(TODAY()-6)", "(TODAY()+1)") +
      ")",

    B15: t_("dash.overdue"),
    D15: t_("dash.dueSoon"),
    F15: t_("dash.openTasks"),
    B16:
      "=COUNTIFS(" +
      tS +
      "!A2:A,FALSE," +
      tS +
      '!B2:B,"<>",' +
      tS +
      '!D2:D,"<"&TODAY())',
    D16:
      "=COUNTIFS(" +
      tS +
      "!A2:A,FALSE," +
      tS +
      '!B2:B,"<>",' +
      tS +
      '!D2:D,">="&TODAY(),' +
      tS +
      '!D2:D,"<"&(TODAY()+4))',
    F16: "=COUNTIFS(" + tS + "!A2:A,FALSE," + tS + '!B2:B,"<>")',
    B17: t_("dash.overdueHint"),
    D17: t_("dash.dueSoonHint"),
    F17:
      "=" +
      tq_("dash.doneCount") +
      "&COUNTIFS(" +
      tS +
      "!A2:A,TRUE," +
      tS +
      '!B2:B,"<>")',
  };
  cells["B" + D.TASKS_H] =
    '=HYPERLINK("#gid=' + taskGid + '",' + tq_("dash.nextTasks") + ")";
  cells["D" + D.TASKS_H] = t_("dash.deadline");
  cells["F" + D.TASKS_H] = t_("dash.left");
  cells["B" + D.TASKS] =
    "=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER(" +
    tS +
    "!B2:B," +
    cond +
    "),FILTER(" +
    tS +
    "!D2:D," +
    cond +
    "),TRUE)," +
    LAYOUT.TASK_LIST +
    ",1)," +
    tq_("dash.noTasks") +
    ")";
  cells["D" + D.TASKS] =
    "=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER(" +
    tS +
    "!D2:D," +
    cond +
    "),1,TRUE)," +
    LAYOUT.TASK_LIST +
    ',1),"")';
  const tEnd = D.TASKS + LAYOUT.TASK_LIST - 1;
  cells["F" + D.TASKS] =
    "=ARRAYFORMULA(IF(ISNUMBER(D" +
    D.TASKS +
    ":D" +
    tEnd +
    "),INT(D" +
    D.TASKS +
    ":D" +
    tEnd +
    ')-TODAY(),""))';

  cells["B" + D.HAB_H] =
    '=HYPERLINK("#gid=' + habGid + '",' + tq_("dash.habits30") + ")";
  cells["D" + D.HAB_H] = t_("dash.progress");
  cells["F" + D.HAB_H] = t_("dash.done");
  const win =
    hS +
    "!$A$" +
    FR +
    ':$A,">"&(TODAY()-30),' +
    hS +
    "!$A$" +
    FR +
    ':$A,"<="&TODAY()';
  cfg.habits.forEach((h, i) => {
    const r = D.HAB + i,
      L = U.col(c.first + i);
    const yes =
      "COUNTIFS(" + hS + "!" + L + "$" + FR + ":" + L + ",TRUE," + win + ")";
    const no =
      "COUNTIFS(" + hS + "!" + L + "$" + FR + ":" + L + ",FALSE," + win + ")";
    cells["B" + r] = "=" + cS + "!A" + (i + 2);
    cells["F" + r] = "=IFERROR(" + yes + "/(" + yes + "+" + no + "),0)";
    cells["D" + r] =
      "=SPARKLINE(F" +
      r +
      ',{"charttype","bar";"max",1;"color1",IF(F' +
      r +
      '>=0.8,"' +
      TH.green +
      '",IF(F' +
      r +
      '>=0.5,"' +
      TH.yellow +
      '","' +
      TH.red +
      '"))})';
  });

  if (rules) {
    const rWin =
      rS +
      "!$A$" +
      FR +
      ':$A,">"&(TODAY()-30),' +
      rS +
      "!$A$" +
      FR +
      ':$A,"<="&TODAY()';
    const rStart = rS + "!$A$" + FR;
    cells["B" + rH] =
      '=HYPERLINK("#gid=' +
      sheet_(rules.sheet).getSheetId() +
      '",' +
      tq_("dash.rules") +
      ")";
    cells["D" + rH] = t_("dash.ruleStreak");
    cells["F" + rH] = t_("dash.ruleKept");
    rules.items.forEach((item, i) => {
      const r = rH + 1 + i,
        L = U.col(rc.first + i);
      const col = rS + "!" + L + "$" + FR + ":" + L;
      const yes = "COUNTIFS(" + col + ",TRUE," + rWin + ")";
      const no = "COUNTIFS(" + col + ",FALSE," + rWin + ")";
      // Clean streak: days since the last missed day before today, plus today once it is ticked.
      const lastMiss =
        "MAXIFS(" +
        rS +
        "!$A$" +
        FR +
        ":$A," +
        col +
        ",FALSE," +
        rS +
        "!$A$" +
        FR +
        ':$A,"<"&TODAY())';
      const todayKept =
        "COUNTIFS(" + rS + "!$A$" + FR + ":$A,TODAY()," + col + ",TRUE)";
      cells["B" + r] = "=" + cS + "!" + U.col(SETTINGS_COL.rules) + (i + 2);
      cells["D" + r] =
        "=MAX(0,TODAY()-1-MAX(" + lastMiss + "," + rStart + "-1))+" + todayKept;
      cells["F" + r] = "=IFERROR(" + yes + "/(" + yes + "+" + no + "),0)";
    });
  }

  // Hidden chart data (X:Z)
  cells.X2 = t_("dash.chartDate");
  cells.Y2 = t_("dash.chartXp");
  cells.Z2 = t_("dash.chartDone");
  cells.X3 = "=SEQUENCE(30,1,TODAY()-29,1)";
  cells.Y3 =
    "=ARRAYFORMULA(IFERROR(VLOOKUP(X3:X32," +
    hS +
    "!A" +
    FR +
    ":" +
    pctL +
    "," +
    c.xp +
    ",FALSE),0)" +
    plusExtras(
      (e) =>
        "IFERROR(VLOOKUP(X3:X32," +
        e.S +
        "!A" +
        FR +
        ":" +
        e.pctL +
        "," +
        e.c.xp +
        ",FALSE),0)",
    ) +
    "+SUMIF(" +
    tS +
    '!H2:H,"<"&(X3:X32+1),' +
    tS +
    "!F2:F)-SUMIF(" +
    tS +
    '!H2:H,"<"&X3:X32,' +
    tS +
    "!F2:F))";
  cells.Z3 =
    "=ARRAYFORMULA(IFERROR(VLOOKUP(X3:X32," +
    hS +
    "!A" +
    FR +
    ":" +
    pctL +
    "," +
    c.pct +
    ",FALSE),0))";
  cells["X" + D.CAT_H] = t_("dash.category");
  cells["Y" + D.CAT_H] = t_("dash.open");
  cfg.categories.forEach((cat, i) => {
    const r = D.CAT_H + 1 + i;
    cells["X" + r] = cat;
    cells["Y" + r] =
      "=COUNTIFS(" +
      tS +
      "!C2:C,X" +
      r +
      "," +
      tS +
      "!A2:A,FALSE," +
      tS +
      '!B2:B,"<>")';
  });

  writeCells_(sh, cells);

  sh.getRange("D6").setNumberFormat("#,##0");
  sh.getRange("F6").setNumberFormat("#,##0");
  sh.getRange("F11").setNumberFormat("0%");
  sh.getRange("D" + D.TASKS + ":D" + tEnd).setNumberFormat(t_("fmt.date"));
  sh.getRange("F" + D.TASKS + ":F" + tEnd).setNumberFormat(t_("fmt.daysLeft"));
  sh.getRange("F" + D.HAB + ":F" + (D.HAB + n - 1)).setNumberFormat("0%");
  if (m) {
    sh.getRange("D" + (rH + 1) + ":D" + (rH + m)).setNumberFormat(
      t_("fmt.streakDays"),
    );
    sh.getRange("F" + (rH + 1) + ":F" + (rH + m)).setNumberFormat("0%");
  }
  sh.getRange("X3:X32").setNumberFormat(t_("fmt.dayMonth"));
  sh.getRange("Z3:Z32").setNumberFormat("0%");
}

/** Dashboard row of the rules section header: one gap row below the habit list. */
function rulesHeaderRow_() {
  return D.HAB + cfg_().habits.length + 1;
}
