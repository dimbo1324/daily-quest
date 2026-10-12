/**
 * UI strings. English is the built-in language; a config may override any key through its
 * `strings` object (see config.schema.json), which is how a personal config localizes the UI
 * without putting another language into the repository.
 *
 * Placeholders: {0}, {1}, ... Values used inside sheet formulas are escaped by the caller.
 */

const STRINGS_EN = {
  'app.title': '🎮 Daily Quest',

  'sheet.dashboard': 'Dashboard',
  'sheet.stats': 'Stats',
  'sheet.habits': 'Habits',
  'sheet.rules': 'Rules',
  'sheet.tasks': 'Tasks',
  'sheet.shop': 'Shop',
  'sheet.settings': 'Settings',

  'menu.today': '📅 Go to today',
  'menu.add30': '➕ Add 30 days',
  'menu.settings': '⚙️ Settings',
  'menu.import': '📥 Import from JSON',
  'menu.export': '📤 Export to JSON',
  'menu.resetConfig': '↩️ Restore default examples',
  'menu.restyle': '🎨 Refresh styling',
  'menu.rebuild': '♻️ Rebuild (data is kept)',
  'menu.restore': '🛟 Restore from backup',
  'menu.hardReset': '🧨 Reset everything and rebuild',
  'menu.about': 'ℹ️ About',

  'days.all': 'Every day',
  'days.monsat': 'Mon–Sat',
  'days.monfri': 'Mon–Fri',
  'days.sat': 'Sat',
  'days.sun': 'Sun',
  'weekdays': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],

  'kind.keep': '✅ Keep',
  'kind.avoid': '🚫 Avoid',

  'priority.high': '🔥 High',
  'priority.medium': 'Medium',
  'priority.low': 'Low',

  'ranks': ['Novice', 'Apprentice', 'Explorer', 'Adept', 'Veteran',
    'Expert', 'Master', 'Grandmaster', 'Champion', 'Legend'],

  'fmt.date': 'dd.mm.yyyy',
  'fmt.dateShort': 'dd.mm.yy',
  'fmt.dayMonth': 'dd.mm',
  'fmt.chartDayMonth': 'dd.MM',
  'fmt.dateTime': 'dd.MM.yyyy HH:mm',
  'fmt.daysLeft': '"in "0" d.";"overdue "0" d.";"today"',
  'fmt.streakDays': '0" d."',

  'op.busy': '⏳ Another operation is running. Try again in a minute.',
  'op.error': 'Error: {0}\n\n{1}',
  'op.build': 'Building the tracker',
  'op.reset': 'Resetting the tracker',
  'op.restore': 'Restoring',
  'op.restyle': 'Styling',
  'op.today': 'Going to today',
  'op.addDays': 'Adding days',
  'op.resetConfig': 'Resetting settings',

  'msg.rebuilt': '♻️ Tracker rebuilt, all ticks kept.',
  'msg.built': '✅ Tracker built. Have a good game!',
  'msg.confirmRebuild': 'Rebuild structure and styling?\n\nAll ticks, tasks and purchases are kept. A backup is made first.',
  'msg.confirmHardReset': '⚠️ This deletes ALL ticks, tasks and purchases and builds the tracker from scratch.\n\n' +
    'A backup is kept; bring it back with «🛟 Restore from backup».\n\nContinue?',
  'msg.hardResetDone': '🧨 Tracker rebuilt from scratch. Backup saved.',
  'msg.noBackup': 'No backup found.',
  'msg.confirmRestore': 'Restore data from the backup of {0}?\n\nThe current state will be replaced.',
  'msg.restored': '🛟 Data restored from the backup of {0}',
  'msg.restyled': '🎨 Styling refreshed.',
  'msg.about': 'Version: {0}\nBuilt: {1}\nLast backup: {2}\nHabits: {3}\nCalendar: {4} – {5}\n\n' +
    'The script can only access this spreadsheet (@OnlyCurrentDoc).',
  'msg.todayMissing': 'Today is not in the calendar. Add days from the menu.',
  'msg.added30': '➕ 30 days added.',
  'msg.autoAdded30': '➕ 30 days added automatically.',
  'msg.notBuilt': 'The tracker is not built yet. Run the setup function or «♻️ Rebuild».',
  'msg.lostTicks': 'ℹ️ {0} ticks were not carried over: those habits are no longer in the list.',
  'msg.confirmResetConfig': 'Restore the example habits, tasks and rewards from the code?\n\n' +
    'Ticks of habits that exist in the examples are kept; the rest are dropped (a backup is made).',
  'msg.configReset': '↩️ Default settings restored.',
  'msg.configApplied': '✅ Settings applied',
  'msg.dayClosed': '🏆 Day closed at 100 %! Keep it up.',
  'msg.taskNeedsTitle': 'Type the task into the «{0}» column first.',
  'msg.rewardNeedsName': 'Type the reward name first.',
  'msg.notEnoughCoins': '🪙 {0} coins short for «{1}». A few more quests!',
  'msg.bought': '🛒 Bought: {0}. Balance left: {1} 🪙',
  'msg.levelUp': '🎉 NEW LEVEL {0}: {1}!',
  'msg.ruleKept': '🛡️ {0}',
  'msg.xpGained': '+{0} XP · to level {1}: {2} XP',

  'err.settingsDays': 'Sheet «{0}», row {1}: pick the days from the list (now «{2}»).',
  'err.settingsKind': 'Sheet «{0}», row {1}: pick the rule type from the list (now «{2}»).',
  'err.settingsXp': 'Sheet «{0}», row {1}: XP must be a number.',
  'err.lastDate': 'Could not read the last date on sheet «{0}».',
  'err.notJson': 'This is not JSON: {0}',
  'err.notObject': 'Expected an object { ... }.',
  'err.config': 'Check the config:\n• {0}',

  'dialog.exportTitle': '📤 Export settings',
  'dialog.exportHint': 'Copy and save this into <b>my-config.json</b> (it stays out of the repository).',
  'dialog.importTitle': '📥 Import settings',
  'dialog.importHint': 'Paste the JSON file contents. Ticks of habits that stay in the list are kept.',
  'dialog.importButton': 'Apply and rebuild',
  'dialog.applying': 'Applying…',

  'settings.habit': 'Habit',
  'settings.rule': 'Rule',
  'settings.kind': 'Type',
  'settings.xp': 'XP',
  'settings.days': 'Days',
  'settings.param': 'Parameter',
  'settings.value': 'Value',
  'settings.xpPerLevel': 'XP per level',
  'settings.coinsPerXp': 'Coins per 1 XP',
  'settings.streakThreshold': 'Streak day threshold',
  'settings.help': [
    '💡 How to use',
    '• Change a habit\'s XP in column B — everything recalculates.',
    '• On the right: XP per level, coins per 1 XP, streak threshold (share of habits done).',
    '• New habit: add a row below the list (name, XP, days), then menu «♻️ Rebuild».',
    '• Rules (table on the right): things to keep or to avoid. Tick a rule on the Rules sheet when you kept it that day.',
    '• A backup is saved automatically before every rebuild.',
    '• The script only works with this spreadsheet (@OnlyCurrentDoc).',
  ],
  'settings.daysHelp': 'Pick the days from the list',
  'settings.kindHelp': 'Keep or avoid',
  'settings.xpHelp': 'XP: a number from 0 to 1000',
  'settings.thresholdHelp': 'For example 0.8 = 80 %',

  'habits.date': 'Date',
  'habits.day': 'Day',
  'habits.xp': 'XP',
  'habits.done': 'Done',
  'habits.streak': 'Streak',
  'rules.kept': 'Kept',

  'tasks.done': '✓',
  'tasks.title': 'Task',
  'tasks.category': 'Category',
  'tasks.deadline': 'Deadline',
  'tasks.priority': 'Priority',
  'tasks.xp': 'XP',
  'tasks.notes': 'Notes',
  'tasks.completed': 'Completed',
  'tasks.left': '⏳ Left',
  'tasks.deadlineHelp': 'Enter a date, for example 25.10.2026',
  'tasks.xpHelp': 'XP per task: 0–500',

  'shop.reward': 'Reward',
  'shop.price': 'Price 🪙',
  'shop.bought': 'Bought',
  'shop.date': 'Date',
  'shop.balance': '🪙 Balance',
  'shop.earned': 'Earned',
  'shop.spent': 'Spent',
  'shop.hint': 'Tick «Bought» when you spend coins. If there are not enough coins, the purchase is undone. ' +
    'Add your own rewards in the empty rows.',
  'shop.priceHelp': 'Price in coins',

  'dash.title': '🎮 DAILY QUEST',
  'dash.subLevel': 'Level ',
  'dash.subStreak': ' · streak ',
  'dash.subDays': ' d.',
  'dash.level': '⭐ LEVEL',
  'dash.totalXp': '✨ TOTAL XP',
  'dash.coins': '🪙 COINS',
  'dash.openShop': '🛒 open the shop →',
  'dash.toLevel': 'to level ',
  'dash.onLevel': ' XP on this level',
  'dash.earned': 'earned ',
  'dash.spent': ' · spent ',
  'dash.todayXp': '📅 TODAY, XP',
  'dash.streakDays': '🔥 STREAK, DAYS',
  'dash.avg7': '📈 7-DAY AVERAGE',
  'dash.streakRule': 'in a row with completion ≥ ',
  'dash.habitsToday': ' of habits today',
  'dash.record': 'record: ',
  'dash.weekXp': 'XP this week: ',
  'dash.overdue': '⏰ OVERDUE',
  'dash.dueSoon': '⚡ DUE IN ≤ 3 DAYS',
  'dash.openTasks': '📋 OPEN TASKS',
  'dash.overdueHint': 'tasks past their deadline',
  'dash.dueSoonHint': 'to do in the next few days',
  'dash.doneCount': 'done: ',
  'dash.nextTasks': '🎯 NEXT TASKS →',
  'dash.deadline': 'DEADLINE',
  'dash.left': 'LEFT',
  'dash.noTasks': 'No open tasks with a deadline 🎉',
  'dash.habits30': '📊 HABITS, LAST 30 DAYS →',
  'dash.progress': 'PROGRESS',
  'dash.done': 'DONE',
  'dash.rules': '🛡️ RULES →',
  'dash.ruleStreak': 'STREAK',
  'dash.ruleKept': 'KEPT, 30 D',
  'dash.chartDate': 'Date',
  'dash.chartXp': 'XP',
  'dash.chartDone': 'Done',
  'dash.category': 'Category',
  'dash.open': 'Open',
  'dash.chartXpTitle': 'XP and completion, last 30 days',
  'dash.chartCatTitle': 'Open tasks by category',

  'stats.title': '📈 STATS',
  'stats.subtitle': 'Your progress at a glance · updates live',
  'stats.bestStreak': '🏆 BEST STREAK',
  'stats.current': 'current: ',
  'stats.perfectDays': '💯 PERFECT DAYS',
  'stats.perfectHint': 'days with 100 % of habits done',
  'stats.ticks': '✅ TICKS',
  'stats.ticksHint': 'habits done and rules kept, all time',
  'stats.avg30': '📅 30-DAY AVERAGE',
  'stats.heatmap': '🗓️ HABIT COMPLETION, LAST 26 WEEKS',
  'stats.less': 'less',
  'stats.more': 'more',
  'stats.date': 'Date',
  'stats.totalXp': 'Total XP',
  'stats.week': 'Week',
  'stats.habits': 'Habits',
  'stats.rules': 'Rules',
  'stats.tasks': 'Tasks',
  'stats.share': 'Share',
  'stats.weekday': 'Weekday',
  'stats.source': 'Source',
  'stats.xp': 'XP',
  'stats.chartTotal': 'Total XP over time',
  'stats.chartWeekly': 'XP per week by source, last 12 weeks',
  'stats.chartSource': 'Where your XP comes from',
  'stats.chartHabits': 'Habits: completion, last 30 days',
  'stats.chartRules': 'Rules: kept, last 30 days',
  'stats.chartWeekday': 'Average completion by weekday',

  'logs.time': 'Time',
  'logs.event': 'Event',
  'logs.sheet': 'Sheet',
  'logs.cell': 'Cell',
  'logs.old': 'Old value',
  'logs.new': 'New value',
  'logs.details': 'Details',

  'protect.logs': 'the log is written automatically; editing it breaks the audit trail',
  'protect.stats': 'statistics are calculated automatically',
  'protect.dashboard': 'the dashboard is calculated automatically',
  'protect.habitHeader': 'habit headers and XP',
  'protect.ruleHeader': 'rule headers and XP',
  'protect.dates': 'dates',
  'protect.formulas': 'XP / % / streak formulas',
  'protect.taskLeft': 'the «Left» column is calculated',
  'protect.balance': 'the balance is calculated',
  'protect.backup': 'backup',
  'backup.banner': 'Daily Quest backup — do not edit this sheet',
};

/** Effective string for `key`: config override first, then English. Arrays are returned as copies. */
function t_(key) {
  const overrides = cfg_().strings || {};
  let v = Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : STRINGS_EN[key];
  if (v === undefined) throw new Error('Unknown UI string: ' + key);
  if (Array.isArray(v)) return v.slice();
  for (let i = 1; i < arguments.length; i++) v = v.split('{' + (i - 1) + '}').join(String(arguments[i]));
  return v;
}

/** A string as a sheet-formula literal: "text" with inner quotes doubled. */
function tq_(key) {
  return '"' + String(t_(key)).replace(/"/g, '""') + '"';
}

/** Sheet names. The backup sheet name is fixed so a backup survives a language change. */
function names_() {
  return {
    dash: t_('sheet.dashboard'), stats: t_('sheet.stats'), habits: t_('sheet.habits'), tasks: t_('sheet.tasks'),
    rules: t_('sheet.rules'), shop: t_('sheet.shop'), cfg: t_('sheet.settings'), backup: '_backup',
  };
}

function dayLabel_(key) { return t_('days.' + key); }
function priorityLabel_(key) { return t_('priority.' + key); }
function kindLabel_(key) { return t_('kind.' + key); }
