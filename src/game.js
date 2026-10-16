/**
 * Game reactions to edits (simple onEdit trigger): every edit is logged first, then XP toasts,
 * level-ups, task completion dates and purchase checks.
 */

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const r = e.range;
    logEdit_(e);
    const SH = names_();
    const sh = r.getSheet();
    const name = sh.getName();
    if (r.getNumRows() !== 1 || r.getNumColumns() !== 1) {
      if (name === SH.tasks) onTasksBulkEdit_(sh, r);
      else if (name === SH.shop) onShopBulkEdit_(sh, r);
      return;
    }
    const tracker = trackers_().filter((t) => t.sheet === name)[0];
    if (tracker) onTrackerEdit_(sh, r, tracker);
    else if (name === SH.tasks) onTaskEdit_(sh, r);
    else if (name === SH.shop) onShopEdit_(sh, r);
  } catch (err) {
    console.error("onEdit", err && err.stack ? err.stack : err);
  }
}

function onTrackerEdit_(sh, r, t) {
  const c = trackCols_(t);
  const row = r.getRow(),
    col = r.getColumn();
  if (row < LAYOUT.FIRST_ROW || col < c.first || col > c.last) return;
  if (r.getValue() !== true) return;
  const xp = Number(sh.getRange(2, col).getValue()) || 0;
  if (t.key === "rules") {
    celebrate_(xp, t_("msg.ruleKept", t.items[col - c.first].name));
    return;
  }
  if (t.key === "routine") {
    SpreadsheetApp.flush();
    const done = Number(sh.getRange(row, c.pct).getValue());
    const perfect = done >= 1 && t.bonus > 0;
    celebrate_(
      xp + (perfect ? t.bonus : 0),
      t_("msg.routineDone", t.items[col - c.first].name),
    );
    if (perfect) {
      logEvent_("routine-perfect-day", {
        sheet: sh.getName(),
        details: "+" + t.bonus + " XP",
      });
      notify_(t_("msg.routinePerfect", t.bonus), 8);
    }
    return;
  }
  celebrate_(xp);
  const pct = Number(sh.getRange(row, c.pct).getValue());
  if (pct >= 1) notify_(t_("msg.dayClosed"), 6);
}

function onTaskEdit_(sh, r) {
  const row = r.getRow(),
    col = r.getColumn();
  if (row < 2 || col !== 1) return;
  const title = String(sh.getRange(row, 2).getValue()).trim();
  const done = sh.getRange(row, 8);
  if (r.getValue() === true) {
    if (!title) {
      r.setValue(false);
      logEvent_("task-refused", {
        sheet: sh.getName(),
        cell: r.getA1Notation(),
        details: "no title; tick undone",
      });
      notify_(t_("msg.taskNeedsTitle", t_("tasks.title")));
      return;
    }
    done.setValue(new Date()).setNumberFormat(t_("fmt.date"));
    celebrate_(Number(sh.getRange(row, 6).getValue()) || 0, "✅ " + title);
  } else {
    done.clearContent();
  }
}

/** Ticks in bulk (paste, Space on a selection): untitled rows are undone, dates follow ticks. */
function onTasksBulkEdit_(sh, r) {
  const first = Math.max(r.getRow(), 2);
  const last = r.getLastRow();
  if (r.getColumn() > 1 || last < first) return;
  const rows = last - first + 1;
  const ab = sh.getRange(first, 1, rows, 2).getValues();
  const doneRange = sh.getRange(first, 8, rows, 1);
  const done = doneRange.getValues();
  const plan = planTaskTicks_(ab, done, new Date());
  if (plan.undone) {
    sh.getRange(first, 1, rows, 1).setValues(plan.ticks);
    notify_(t_("msg.taskNeedsTitle", t_("tasks.title")));
  }
  doneRange.setValues(plan.done).setNumberFormat(t_("fmt.date"));
  logEvent_("tasks-bulk", {
    sheet: sh.getName(),
    cell: r.getA1Notation(),
    details: plan.undone + " untitled ticks undone",
  });
}

/** Pure part of onTasksBulkEdit_: [[tick, title]] and [[date]] → new ticks, dates, undone count. */
function planTaskTicks_(ab, done, now) {
  let undone = 0;
  const ticks = ab.map((r) => {
    if (r[0] === true && !String(r[1]).trim()) {
      undone++;
      return [false];
    }
    return [r[0]];
  });
  const dates = ab.map((r, i) =>
    ticks[i][0] === true
      ? [done[i][0] instanceof Date ? done[i][0] : now]
      : [""],
  );
  return { ticks, done: dates, undone };
}

/** Purchases go one at a time so the balance check runs: bulk ticks of «Bought» are undone. */
function onShopBulkEdit_(sh, r) {
  const first = Math.max(r.getRow(), 2);
  const last = r.getLastRow();
  if (r.getColumn() > 3 || r.getLastColumn() < 3 || last < first) return;
  const rows = last - first + 1;
  const ticks = sh.getRange(first, 3, rows, 1).getValues();
  const dates = sh.getRange(first, 4, rows, 1).getValues();
  let undone = 0;
  const next = ticks.map((t, i) => {
    if (t[0] === true && !(dates[i][0] instanceof Date)) {
      undone++;
      return [false];
    }
    return [t[0]];
  });
  if (!undone) return;
  sh.getRange(first, 3, rows, 1).setValues(next);
  logEvent_("purchase-refused", {
    sheet: sh.getName(),
    cell: r.getA1Notation(),
    details: undone + " bulk purchases undone",
  });
  notify_(t_("msg.buyOneByOne"), 8);
}

function onShopEdit_(sh, r) {
  const row = r.getRow(),
    col = r.getColumn();
  if (row < 2 || col !== 3) return;
  const name = String(sh.getRange(row, 1).getValue()).trim();
  const date = sh.getRange(row, 4);
  if (r.getValue() !== true) {
    date.clearContent();
    return;
  }
  if (!name) {
    r.setValue(false);
    logEvent_("purchase-refused", {
      sheet: sh.getName(),
      cell: r.getA1Notation(),
      details: "no reward name; tick undone",
    });
    notify_(t_("msg.rewardNeedsName"));
    return;
  }
  SpreadsheetApp.flush();
  const balance = Number(sheet_(names_().dash).getRange("F6").getValue());
  if (!Number.isFinite(balance) || balance < 0) {
    r.setValue(false);
    logEvent_("purchase-refused", {
      sheet: sh.getName(),
      cell: r.getA1Notation(),
      details: name + ": balance " + balance,
    });
    notify_(t_("msg.notEnoughCoins", Math.abs(Math.round(balance)), name), 8);
    return;
  }
  date.setValue(new Date()).setNumberFormat(t_("fmt.date"));
  logEvent_("purchase", {
    sheet: sh.getName(),
    cell: r.getA1Notation(),
    details: name + ", balance left " + balance,
  });
  notify_(t_("msg.bought", name, balance), 6);
}

function celebrate_(xp, title) {
  if (!xp) return;
  SpreadsheetApp.flush();
  const SH = names_();
  const total = Number(sheet_(SH.dash).getRange("D6").getValue()) || 0;
  const per =
    Number(sheet_(SH.cfg).getRange("F2").getValue()) || cfg_().xpPerLevel;
  const ranks = t_("ranks");
  const lvlNow = Math.floor(total / per) + 1;
  const lvlBefore = Math.floor((total - xp) / per) + 1;
  if (lvlNow > lvlBefore) {
    logEvent_("level-up", {
      details: "level " + lvlNow + ", " + total + " XP",
    });
    notify_(
      t_("msg.levelUp", lvlNow, ranks[Math.min(lvlNow, ranks.length) - 1]),
      10,
    );
  } else {
    notify_(
      (title ? title + "\n" : "") +
        t_("msg.xpGained", xp, lvlNow + 1, per - (total % per)),
      4,
    );
  }
}
