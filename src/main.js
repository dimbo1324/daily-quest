/**
 * @OnlyCurrentDoc
 *
 * DAILY QUEST — a gamified habit and task tracker for Google Sheets.
 *
 * Install
 *  1. Extensions → Apps Script → add every file from src/ (or `npm run push` with clasp).
 *  2. Run `setup` and grant access. An existing tracker is rebuilt WITH its ticks kept.
 *  3. Reload the spreadsheet: the «🎮 Daily Quest» menu appears.
 *
 * Safety
 *  - @OnlyCurrentDoc: the script can reach this spreadsheet only.
 *  - Every rebuild writes a backup to the hidden `_backup` sheet first.
 *  - Destructive actions ask for confirmation; a document lock prevents double runs.
 *
 * Personal settings never live in code: see config.js and README.md.
 */

const VERSION = '2.5.0';

// ═════════════════════════ Menu and entry points ═════════════════════════

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu(t_('app.title'))
      .addItem(t_('menu.today'), 'goToday')
      .addItem(t_('menu.add30'), 'add30Days')
      .addSeparator()
      .addSubMenu(ui.createMenu(t_('menu.settings'))
        .addItem(t_('menu.import'), 'menuImportConfig')
        .addItem(t_('menu.export'), 'menuExportConfig')
        .addItem(t_('menu.resetConfig'), 'menuResetConfig'))
      .addItem(t_('menu.restyle'), 'menuRestyle')
      .addItem(t_('menu.rebuild'), 'menuRebuildKeep')
      .addItem(t_('menu.restore'), 'menuRestore')
      .addSeparator()
      .addItem(t_('menu.hardReset'), 'menuHardReset')
      .addItem(t_('menu.about'), 'menuAbout')
      .addToUi();
  } catch (e) { console.error('menu', e); }
  logEvent_('open');
  try { autoExtend_(); } catch (e) { console.error('autoExtend', e); }
}

/** Main entry point: first build, or a rebuild that keeps all data. */
function setup() {
  run_(t_('op.build'), () => {
    if (trackerExists_()) {
      const state = exportState_();
      writeBackup_(state);
      applySettingsSheet_();
      buildAll_(state);
      logEvent_('rebuild', { details: 'version ' + VERSION + ', backup written' });
      notify_(t_('msg.rebuilt'), 8);
    } else {
      buildAll_(null);
      logEvent_('build', { details: 'version ' + VERSION });
      notify_(t_('msg.built'), 8);
    }
  });
}

function menuRebuildKeep() {
  if (confirm_(t_('msg.confirmRebuild')) !== true) return;
  setup();
}

function menuHardReset() {
  if (confirm_(t_('msg.confirmHardReset')) !== true) return;
  run_(t_('op.reset'), () => {
    if (trackerExists_()) writeBackup_(exportState_());
    buildAll_(null);
    logEvent_('reset', { details: 'all data cleared, backup written' });
    notify_(t_('msg.hardResetDone'), 8);
  });
}

function menuRestore() {
  const st = readBackup_();
  if (!st) { alert_(t_('msg.noBackup')); return; }
  const when = st.exportedAt ? Utilities.formatDate(new Date(st.exportedAt), cfg_().timezone, t_('fmt.dateTime')) : '—';
  if (confirm_(t_('msg.confirmRestore', when)) !== true) return;
  run_(t_('op.restore'), () => {
    buildAll_(st);
    logEvent_('restore', { details: 'backup of ' + (st.exportedAt || '?') });
    notify_(t_('msg.restored', when), 8);
  });
}

function menuRestyle() {
  run_(t_('op.restyle'), () => { styleAll_(); logEvent_('restyle'); notify_(t_('msg.restyled')); });
}

function menuAbout() {
  const p = PropertiesService.getDocumentProperties();
  const fmt = iso => iso ? Utilities.formatDate(new Date(iso), cfg_().timezone, t_('fmt.dateTime')) : '—';
  const sh = sheet_(names_().habits);
  const first = sh && sh.getLastRow() >= LAYOUT.FIRST_ROW ? U.isoOrEmpty(sh.getRange(LAYOUT.FIRST_ROW, 1).getValue()) : '';
  const last = sh ? lastDateIso_(sh) : '';
  alert_(t_('msg.about', VERSION, fmt(p.getProperty('dq_built_at')), fmt(p.getProperty('dq_last_backup')),
    cfg_().habits.length, first || '—', last || '—'));
}

function goToday() {
  run_(t_('op.today'), () => {
    const sh = requireTracker_();
    if (!sh) return;
    const row = findDateRow_(sh, U.iso(new Date()));
    if (!row) { alert_(t_('msg.todayMissing')); return; }
    ss_().setActiveSheet(sh);
    sh.setActiveRange(sh.getRange(row, habitCols_().first));
    logEvent_('go-today', { sheet: sh.getName(), cell: 'A' + row });
  });
}

function add30Days() {
  run_(t_('op.addDays'), () => {
    if (!requireTracker_()) return;
    extendTrackers_(30);
    logEvent_('days-added', { details: '30 days' });
    notify_(t_('msg.added30'));
  });
}

function requireTracker_() {
  const sh = sheet_(names_().habits);
  if (!sh || sh.getLastRow() < LAYOUT.FIRST_ROW) {
    alert_(t_('msg.notBuilt'));
    return null;
  }
  return sh;
}

function trackerExists_() {
  const sh = sheet_(names_().habits);
  return !!sh && sh.getLastRow() >= LAYOUT.FIRST_ROW;
}

/** On open: fewer than MIN_FUTURE_DAYS days ahead → add 30 more. */
function autoExtend_() {
  const sh = sheet_(names_().habits);
  if (!sh || sh.getLastRow() < LAYOUT.FIRST_ROW) return;
  const lastIso = lastDateIso_(sh);
  if (!lastIso) return;
  if (U.diffDays(U.todayParts(), U.parts(lastIso)) >= LAYOUT.MIN_FUTURE_DAYS) return;
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return;
  try {
    if (extendTrackers_(30)) {
      logEvent_('days-added', { details: '30 days, automatically' });
      notify_(t_('msg.autoAdded30'));
    }
  } finally { lock.releaseLock(); }
}
