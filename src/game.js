/**
 * Game reactions to edits (simple onEdit trigger): XP toasts, level-ups, purchase checks.
 */

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const r = e.range;
    if (r.getNumRows() !== 1 || r.getNumColumns() !== 1) return;
    const SH = names_();
    const sh = r.getSheet();
    const name = sh.getName();
    if (name === SH.habits) onHabitEdit_(sh, r);
    else if (name === SH.tasks) onTaskEdit_(sh, r);
    else if (name === SH.shop) onShopEdit_(sh, r);
  } catch (err) {
    console.error('onEdit', err && err.stack ? err.stack : err);
  }
}

function onHabitEdit_(sh, r) {
  const c = habitCols_();
  const row = r.getRow(), col = r.getColumn();
  if (row < LAYOUT.FIRST_ROW || col < c.first || col > c.last) return;
  if (r.getValue() !== true) return;
  const xp = Number(sh.getRange(2, col).getValue()) || 0;
  celebrate_(xp);
  const pct = Number(sh.getRange(row, c.pct).getValue());
  if (pct >= 1) notify_(t_('msg.dayClosed'), 6);
}

function onTaskEdit_(sh, r) {
  const row = r.getRow(), col = r.getColumn();
  if (row < 2 || col !== 1) return;
  const title = String(sh.getRange(row, 2).getValue()).trim();
  const done = sh.getRange(row, 8);
  if (r.getValue() === true) {
    if (!title) { r.setValue(false); notify_(t_('msg.taskNeedsTitle', t_('tasks.title'))); return; }
    done.setValue(new Date()).setNumberFormat(t_('fmt.date'));
    celebrate_(Number(sh.getRange(row, 6).getValue()) || 0, '✅ ' + title);
  } else {
    done.clearContent();
  }
}

function onShopEdit_(sh, r) {
  const row = r.getRow(), col = r.getColumn();
  if (row < 2 || col !== 3) return;
  const name = String(sh.getRange(row, 1).getValue()).trim();
  const date = sh.getRange(row, 4);
  if (r.getValue() !== true) { date.clearContent(); return; }
  if (!name) { r.setValue(false); notify_(t_('msg.rewardNeedsName')); return; }
  SpreadsheetApp.flush();
  const balance = Number(sheet_(names_().dash).getRange('F6').getValue());
  if (!Number.isFinite(balance) || balance < 0) {
    r.setValue(false);
    notify_(t_('msg.notEnoughCoins', Math.abs(Math.round(balance)), name), 8);
    return;
  }
  date.setValue(new Date()).setNumberFormat(t_('fmt.date'));
  notify_(t_('msg.bought', name, balance), 6);
}

function celebrate_(xp, title) {
  if (!xp) return;
  SpreadsheetApp.flush();
  const SH = names_();
  const total = Number(sheet_(SH.dash).getRange('D6').getValue()) || 0;
  const per = Number(sheet_(SH.cfg).getRange('F2').getValue()) || cfg_().xpPerLevel;
  const ranks = t_('ranks');
  const lvlNow = Math.floor(total / per) + 1;
  const lvlBefore = Math.floor((total - xp) / per) + 1;
  if (lvlNow > lvlBefore) {
    notify_(t_('msg.levelUp', lvlNow, ranks[Math.min(lvlNow, ranks.length) - 1]), 10);
  } else {
    notify_((title ? title + '\n' : '') + t_('msg.xpGained', xp, lvlNow + 1, per - (total % per)), 4);
  }
}
