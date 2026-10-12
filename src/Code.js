/**
 * @OnlyCurrentDoc
 *
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  🎮 DAILY QUEST v2 — геймифицированный ежедневник для Google Sheets ║
 * ╚════════════════════════════════════════════════════════════════════╝
 *
 * УСТАНОВКА
 *  1. Создай новую Google-таблицу (или открой ту, где стоит v1).
 *  2. Расширения → Apps Script → выдели весь старый код (Ctrl+A) → вставь этот → Ctrl+S.
 *  3. Выбери функцию «setup» → «Выполнить» → разреши доступ.
 *     Если в таблице уже есть трекер, он пересоберётся С СОХРАНЕНИЕМ отметок.
 *  4. Обнови вкладку с таблицей (F5) → появится меню «🎮 Daily Quest».
 *
 * БЕЗОПАСНОСТЬ
 *  • @OnlyCurrentDoc — скрипт имеет доступ ТОЛЬКО к этой таблице
 *    (никакого Gmail, Drive, интернета и других файлов).
 *  • Перед любой пересборкой автоматически создаётся резервная копия
 *    (скрытый лист «_backup»), восстановление — через меню.
 *  • Разрушительные действия требуют подтверждения.
 *  • Блокировка от двойного запуска (LockService), проверка конфигурации,
 *    мягкая защита формул от случайной правки (предупреждение).
 *
 * НАСТРОЙКА
 *  • XP за привычку и параметры игры — на листе «Настройки».
 *  • Привычки (название, XP, дни) — на листе «Настройки», затем меню
 *    «♻️ Пересобрать (данные сохранятся)».
 *  • Полный конфиг (привычки, задачи, награды, категории) — меню
 *    «⚙️ Настройки → Импорт / Экспорт JSON». Личные данные в код не вшиты.
 */

const VERSION = '2.1.0';

// ═══════════════════════════════ КОНФИГ ═══════════════════════════════
// Здесь только НЕЙТРАЛЬНЫЙ ПРИМЕР. Свои привычки, задачи и награды ты задаёшь
// без правки кода: на листе «Настройки» (привычки) или через меню
// «⚙️ Настройки → Импорт из JSON». Личный конфиг хранится только в твоей таблице
// (свойства документа) и в твоём JSON-файле — в репозиторий он не попадает.

const DEFAULT_CFG = {
  timezone: 'America/Montevideo',
  daysToCreate: 60,        // сколько дней вперёд создавать
  xpPerLevel: 500,         // XP на уровень
  coinsPerXp: 0.1,         // монет за 1 XP
  streakThreshold: 0.8,    // день идёт в серию при выполнении ≥ 80 %

  categories: ['Работа', 'Здоровье', 'Учёба', 'Спорт', 'Быт', 'Личное'],

  // [название, XP, дни]   дни: all | monsat | monfri | sat | sun
  habits: [
    ['🧘 Медитация',             10, 'all'],
    ['💪 Тренировка',            20, 'monsat'],
    ['🎾 Теннис или футбол',     20, 'sat'],
    ['📖 Чтение 30 мин',         10, 'all'],
    ['🗣️ Язык 30 мин',           15, 'all'],
    ['🗓️ План на неделю',        20, 'sun'],
  ],

  // [задача, категория, дедлайн ГГГГ-ММ-ДД или '', приоритет, XP]  (только при первой сборке)
  tasks: [
    ['Моя первая задача', 'Личное', '', 'Средний', 10],
  ],

  // [награда, цена в монетах]
  rewards: [
    ['☕ Кофе', 30],
    ['🎬 Вечер кино', 40],
    ['🍕 Вкусный ужин', 50],
    ['🏖️ Выходной от плана', 200],
  ],
};

const CFG_KEY = 'dq_config';

/** Дефолты + личный конфиг из свойств документа. Не использует константы ниже (они ещё не объявлены). */
function loadCfg_() {
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CFG));
  try {
    const raw = PropertiesService.getDocumentProperties().getProperty(CFG_KEY);
    if (raw) {
      const u = JSON.parse(raw);
      Object.keys(DEFAULT_CFG).forEach(k => { if (u[k] !== undefined && u[k] !== null) cfg[k] = u[k]; });
    }
  } catch (e) { console.error('loadCfg_', e); }
  return cfg;
}
let CFG = loadCfg_();

function saveCfg_() {
  PropertiesService.getDocumentProperties().setProperty(CFG_KEY, JSON.stringify(CFG));
}

// ═══════════════════════════════ КОНСТАНТЫ ═══════════════════════════════

const SH = {
  dash: 'Дашборд', habits: 'Привычки', tasks: 'Задачи',
  shop: 'Магазин', cfg: 'Настройки', backup: '_backup',
};

const DAYSETS = {
  all:    [1, 1, 1, 1, 1, 1, 1],
  monsat: [1, 1, 1, 1, 1, 1, 0],
  monfri: [1, 1, 1, 1, 1, 0, 0],
  sat:    [0, 0, 0, 0, 0, 1, 0],
  sun:    [0, 0, 0, 0, 0, 0, 1],
};
const DAYLABELS = { all: 'Каждый день', monsat: 'Пн–Сб', monfri: 'Пн–Пт', sat: 'Сб', sun: 'Вс' };
const PRIORITIES = ['🔥 Высокий', 'Средний', 'Низкий'];
const RANKS = ['Новичок', 'Стажёр', 'Исследователь', 'Инженер', 'Старший инженер',
               'Ведущий инженер', 'Эксперт', 'Архитектор', 'Мастер', 'Легенда'];

const LAYOUT = {
  FIRST_ROW: 3,          // первая строка дней на листе «Привычки»
  TASK_ROWS: 200,
  SHOP_ROWS: 60,
  MIN_FUTURE_DAYS: 14,   // меньше — onOpen сам добавит 30 дней
  BACKUP_CHUNK: 40000,   // лимит ячейки 50 000 символов
  TASK_LIST: 8,          // задач на дашборде
};

// Дашборд: строки
const D = {
  TITLE: 2, SUB: 3,
  C1: 5, C2: 10, C3: 15,          // начала блоков карточек
  TASKS_H: 19, TASKS: 20,
  HAB_H: 29, HAB: 30,
  CAT_H: 35,                      // данные для круговой диаграммы (скрыто, X:Y)
};

// Тёмная палитра (приглушённая)
const TH = {
  bg: '#0f1115', surface: '#161a22', surface2: '#1b202b', header: '#1a1f2c',
  grid: '#1d2230', border: '#2a3142', zebra: '#12151c',
  text: '#e5e7eb', muted: '#9ca3af', dim: '#6b7280', faint: '#475063',
  accent: '#8ea2ff', accentBg: '#1d2440',
  green: '#4ade80', greenBg: '#0f2a1c', greenDeep: '#166534',
  yellow: '#facc15', yellowBg: '#2c2610',
  red: '#f87171', redBg: '#2f1517', redDeep: '#4c1d1d',
  orange: '#fb923c', purple: '#c4b5fd',
  inactiveBg: '#111318', inactiveFg: '#262b36',
  font: 'Roboto',
};

// ═══════════════════════════════ УТИЛИТЫ ═══════════════════════════════

const U = {
  q: name => "'" + String(name).replace(/'/g, "''") + "'",
  col(n) {
    let s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  },
  iso: d => Utilities.formatDate(d, CFG.timezone, 'yyyy-MM-dd'),
  isoOrEmpty: v => (v instanceof Date && !isNaN(v)) ? Utilities.formatDate(v, CFG.timezone, 'yyyy-MM-dd') : '',
  todayParts: () => Utilities.formatDate(new Date(), CFG.timezone, 'yyyy-MM-dd').split('-').map(Number),
  parts: iso => String(iso).split('-').map(Number),
  addDays(p, n) {
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
  },
  diffDays: (a, b) => Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 864e5),
  weekday: p => (new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay() + 6) % 7, // 0 = Пн
  dateF(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const p = U.parts(iso);
    return '=DATE(' + p[0] + ',' + p[1] + ',' + p[2] + ')';
  },
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  /** «=DATE(2026,10,12)» или «=DATE(2026;10;12)» → '2026-10-12' (для сломанных формул v1). */
  isoFromFormula(f) {
    const m = /DATE\(\s*(\d{4})\s*[,;]\s*(\d{1,2})\s*[,;]\s*(\d{1,2})\s*\)/i.exec(String(f || ''));
    return m ? m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2) : '';
  },
  fill: (rows, cols, v) => Array.from({ length: rows }, () => Array(cols).fill(v)),
};

function ss_() { return SpreadsheetApp.getActive(); }
function sheet_(name) { return ss_().getSheetByName(name); }

function notify_(msg, sec) {
  try { ss_().toast(msg, '🎮 Daily Quest', sec || 6); } catch (e) { console.log(msg); }
}
function alert_(msg) {
  try { SpreadsheetApp.getUi().alert('🎮 Daily Quest', msg, SpreadsheetApp.getUi().ButtonSet.OK); }
  catch (e) { console.log(msg); }
}
/** true / false — ответ пользователя; null — UI недоступен (запуск из редактора). */
function confirm_(msg) {
  try {
    const ui = SpreadsheetApp.getUi();
    return ui.alert('🎮 Daily Quest', msg, ui.ButtonSet.YES_NO) === ui.Button.YES;
  } catch (e) { return null; }
}

/** Выполняет действие под блокировкой документа с понятной обработкой ошибок. */
function run_(label, fn) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) {
    notify_('⏳ Уже выполняется другая операция. Попробуй через минуту.', 8);
    return;
  }
  try {
    return fn();
  } catch (e) {
    console.error(label, e && e.stack ? e.stack : e);
    notify_('❌ ' + label + ': ' + e.message, 15);
    alert_('Ошибка: ' + label + '\n\n' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// ═══════════════════════════════ МЕНЮ И ТОЧКИ ВХОДА ═══════════════════════════════

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('🎮 Daily Quest')
      .addItem('📅 Перейти к сегодня', 'goToday')
      .addItem('➕ Добавить 30 дней', 'add30Days')
      .addSeparator()
      .addSubMenu(SpreadsheetApp.getUi().createMenu('⚙️ Настройки')
        .addItem('📥 Импорт из JSON', 'menuImportConfig')
        .addItem('📤 Экспорт в JSON', 'menuExportConfig')
        .addItem('↩️ Вернуть примеры по умолчанию', 'menuResetConfig'))
      .addItem('🎨 Обновить оформление', 'menuRestyle')
      .addItem('♻️ Пересобрать (данные сохранятся)', 'menuRebuildKeep')
      .addItem('🛟 Восстановить из резервной копии', 'menuRestore')
      .addSeparator()
      .addItem('🧨 Сбросить всё и собрать заново', 'menuHardReset')
      .addItem('ℹ️ О трекере', 'menuAbout')
      .addToUi();
  } catch (e) { console.error('menu', e); }
  try { autoExtend_(); } catch (e) { console.error('autoExtend', e); }
}

/** Главная функция: первая сборка или пересборка с сохранением данных. */
function setup() {
  run_('Сборка трекера', () => {
    if (trackerExists_()) {
      const state = exportState_();
      writeBackup_(state);
      applyHabitsFromSheet_();
      buildAll_(state);
      notify_('♻️ Трекер пересобран, все отметки сохранены.', 8);
    } else {
      buildAll_(null);
      notify_('✅ Трекер собран. Удачной игры!', 8);
    }
  });
}

function menuRebuildKeep() {
  if (confirm_('Пересобрать структуру и оформление?\n\nВсе отметки, задачи и покупки сохранятся. ' +
      'Перед этим будет создана резервная копия.') !== true) return;
  setup();
}

function menuHardReset() {
  if (confirm_('⚠️ Это удалит ВСЕ отметки, задачи и покупки и соберёт трекер заново.\n\n' +
      'Резервная копия будет сохранена, её можно вернуть через «🛟 Восстановить».\n\nПродолжить?') !== true) return;
  run_('Сброс трекера', () => {
    if (trackerExists_()) writeBackup_(exportState_());
    buildAll_(null);
    notify_('🧨 Трекер собран с нуля. Резервная копия сохранена.', 8);
  });
}

function menuRestore() {
  const st = readBackup_();
  if (!st) { alert_('Резервная копия не найдена.'); return; }
  const when = st.exportedAt ? Utilities.formatDate(new Date(st.exportedAt), CFG.timezone, 'dd.MM.yyyy HH:mm') : '—';
  if (confirm_('Восстановить данные из резервной копии от ' + when + '?\n\n' +
      'Текущее состояние будет заменено.') !== true) return;
  run_('Восстановление', () => {
    buildAll_(st);
    notify_('🛟 Данные восстановлены из копии от ' + when, 8);
  });
}

function menuRestyle() {
  run_('Оформление', () => { styleAll_(); notify_('🎨 Оформление обновлено.'); });
}

function menuAbout() {
  const p = PropertiesService.getDocumentProperties();
  const fmt = iso => iso ? Utilities.formatDate(new Date(iso), CFG.timezone, 'dd.MM.yyyy HH:mm') : '—';
  alert_('Версия: ' + VERSION +
    '\nСобран: ' + fmt(p.getProperty('dq_built_at')) +
    '\nПоследняя резервная копия: ' + fmt(p.getProperty('dq_last_backup')) +
    '\nПривычек: ' + CFG.habits.length +
    '\n\nДоступ скрипта ограничен этой таблицей (@OnlyCurrentDoc).');
}

function goToday() {
  run_('Переход к сегодня', () => {
    const sh = requireTracker_();
    if (!sh) return;
    const row = findDateRow_(sh, U.iso(new Date()));
    if (!row) { alert_('Сегодняшний день не найден. Добавь дни через меню.'); return; }
    ss_().setActiveSheet(sh);
    sh.setActiveRange(sh.getRange(row, habitCols_().first));
  });
}

function add30Days() {
  run_('Добавление дней', () => {
    const sh = requireTracker_();
    if (!sh) return;
    appendDays_(sh, 30);
    styleHabits_(sh);
    notify_('➕ Добавлено 30 дней.');
  });
}

function requireTracker_() {
  const sh = sheet_(SH.habits);
  if (!sh || sh.getLastRow() < LAYOUT.FIRST_ROW) {
    alert_('Трекер ещё не собран. Запусти функцию setup или «♻️ Пересобрать».');
    return null;
  }
  return sh;
}

function trackerExists_() {
  const sh = sheet_(SH.habits);
  return !!sh && sh.getLastRow() >= LAYOUT.FIRST_ROW;
}

/** При открытии: если впереди меньше 14 дней — добавить ещё 30. */
function autoExtend_() {
  const sh = sheet_(SH.habits);
  if (!sh || sh.getLastRow() < LAYOUT.FIRST_ROW) return;
  const lastIso = lastDateIso_(sh);
  if (!lastIso) return;
  if (U.diffDays(U.todayParts(), U.parts(lastIso)) >= LAYOUT.MIN_FUTURE_DAYS) return;
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(5000)) return;
  try {
    appendDays_(sh, 30);
    styleHabits_(sh);
    notify_('➕ Автоматически добавлено 30 дней.');
  } finally { lock.releaseLock(); }
}

// ═══════════════════════════════ КОНФИГ: ЛИСТ, JSON ═══════════════════════════════

/** Читает привычки с листа «Настройки» (если они там есть) и сохраняет в конфиг документа. */
function applyHabitsFromSheet_() {
  const sh = sheet_(SH.cfg);
  if (!sh || sh.getLastRow() < 2) return;
  const byLabel = {};
  Object.keys(DAYLABELS).forEach(k => { byLabel[DAYLABELS[k]] = k; });
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  const habits = [];
  for (let i = 0; i < vals.length; i++) {
    const name = String(vals[i][0] || '').trim();
    if (!name) continue;
    const key = byLabel[String(vals[i][2]).trim()];
    if (!key) throw new Error('Лист «Настройки», строка ' + (i + 2) + ': выбери дни из списка (сейчас «' + vals[i][2] + '»).');
    const xp = Number(vals[i][1]);
    if (!Number.isFinite(xp)) throw new Error('Лист «Настройки», строка ' + (i + 2) + ': XP должно быть числом.');
    habits.push([name, xp, key]);
  }
  if (!habits.length) return;
  CFG.habits = habits;
  saveCfg_();
}

function exportableCfg_() {
  const o = {};
  ['timezone', 'daysToCreate', 'xpPerLevel', 'coinsPerXp', 'streakThreshold', 'categories', 'habits', 'tasks', 'rewards']
    .forEach(k => { o[k] = CFG[k]; });
  return o;
}

function showTextDialog_(title, html, w, h) {
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(w || 560).setHeight(h || 460), title);
}

function menuExportConfig() {
  try { applyHabitsFromSheet_(); } catch (e) { alert_(e.message); return; }
  const json = JSON.stringify(exportableCfg_(), null, 2)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  showTextDialog_('📤 Экспорт настроек',
    '<style>body{font:13px Roboto,Arial;margin:12px}textarea{width:100%;height:320px;font:12px monospace;box-sizing:border-box}</style>' +
    '<p>Скопируй и сохрани в файл <b>my-config.json</b> (в репозиторий его добавлять не нужно).</p>' +
    '<textarea readonly onclick="this.select()">' + json + '</textarea>');
}

function menuImportConfig() {
  showTextDialog_('📥 Импорт настроек',
    '<style>body{font:13px Roboto,Arial;margin:12px}textarea{width:100%;height:290px;font:12px monospace;box-sizing:border-box}' +
    'button{margin-top:8px;padding:8px 16px;font-size:14px}#m{margin-left:10px;color:#b00}</style>' +
    '<p>Вставь содержимое JSON-файла. Отметки по привычкам, которые остались в списке, сохранятся.</p>' +
    '<textarea id="t" placeholder="{ &quot;habits&quot;: [...] }"></textarea><br>' +
    '<button onclick="go()">Применить и пересобрать</button><span id="m"></span>' +
    '<script>function go(){document.getElementById("m").textContent="Применяю…";' +
    'google.script.run.withSuccessHandler(function(r){document.getElementById("m").style.color="#070";' +
    'document.getElementById("m").textContent=r;setTimeout(function(){google.script.host.close()},1500)})' +
    '.withFailureHandler(function(e){document.getElementById("m").style.color="#b00";document.getElementById("m").textContent=e.message})' +
    '.applyConfigJson(document.getElementById("t").value)}</script>', 560, 440);
}

/** Вызывается из диалога импорта. */
function applyConfigJson(text) {
  let u;
  try { u = JSON.parse(text); } catch (e) { throw new Error('Это не JSON: ' + e.message); }
  if (!u || typeof u !== 'object' || Array.isArray(u)) throw new Error('Ожидается объект { ... }.');
  const prev = JSON.stringify(CFG);
  Object.keys(DEFAULT_CFG).forEach(k => { if (u[k] !== undefined && u[k] !== null) CFG[k] = u[k]; });
  try { validateConfig_(); }
  catch (e) { CFG = JSON.parse(prev); throw e; }
  saveCfg_();
  const state = trackerExists_() ? exportState_() : null;
  if (state) writeBackup_(state);
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) throw new Error('Уже выполняется другая операция. Повтори через минуту.');
  try { buildAll_(state); } finally { lock.releaseLock(); }
  return '✅ Настройки применены';
}

function menuResetConfig() {
  if (confirm_('Вернуть примеры привычек, задач и наград из кода?\n\nОтметки по привычкам, которые есть в примерах, ' +
      'сохранятся; остальные будут удалены (резервная копия создаётся).') !== true) return;
  run_('Сброс настроек', () => {
    PropertiesService.getDocumentProperties().deleteProperty(CFG_KEY);
    CFG = loadCfg_();
    const state = trackerExists_() ? exportState_() : null;
    if (state) writeBackup_(state);
    buildAll_(state);
    notify_('↩️ Настройки по умолчанию восстановлены.', 8);
  });
}

// ═══════════════════════════════ ВАЛИДАЦИЯ ═══════════════════════════════

function validateConfig_() {
  const errs = [];
  const names = new Set();
  if (!CFG.habits.length) errs.push('Список привычек пуст.');
  if (!Array.isArray(CFG.categories) || !CFG.categories.length || CFG.categories.length > 12) errs.push('Категорий должно быть от 1 до 12.');
  if (CFG.habits.length > 40) errs.push('Слишком много привычек (максимум 40).');
  CFG.habits.forEach((h, i) => {
    const [name, xp, days] = h;
    if (!name || typeof name !== 'string') errs.push('Привычка #' + (i + 1) + ': пустое название');
    else if (names.has(name)) errs.push('Повтор привычки: ' + name);
    names.add(name);
    if (!(Number.isFinite(xp) && xp > 0 && xp <= 1000)) errs.push((name || '#' + (i + 1)) + ': XP должно быть 1–1000');
    if (!DAYSETS[days]) errs.push((name || '#' + (i + 1)) + ': неизвестные дни «' + days + '»');
  });
  CFG.tasks.forEach((t, i) => {
    if (t[2] && !/^\d{4}-\d{2}-\d{2}$/.test(t[2])) errs.push('Задача #' + (i + 1) + ': дата должна быть ГГГГ-ММ-ДД или пустой');
    if (!CFG.categories.includes(t[1])) errs.push('Задача #' + (i + 1) + ': неизвестная категория «' + t[1] + '»');
    if (!PRIORITIES.includes(t[3])) errs.push('Задача #' + (i + 1) + ': неизвестный приоритет «' + t[3] + '»');
  });
  CFG.rewards.forEach((r, i) => {
    if (!(Number.isFinite(r[1]) && r[1] > 0)) errs.push('Награда #' + (i + 1) + ': цена должна быть > 0');
  });
  [['xpPerLevel', 1, 1e6], ['coinsPerXp', 0, 100], ['streakThreshold', 0.01, 1], ['daysToCreate', 7, 400]]
    .forEach(([k, a, b]) => { if (!(CFG[k] >= a && CFG[k] <= b)) errs.push('Параметр ' + k + ' вне диапазона ' + a + '–' + b); });
  if (errs.length) throw new Error('Проверь конфиг:\n• ' + errs.join('\n• '));
}

// ═══════════════════════════════ СОСТОЯНИЕ: ЭКСПОРТ / БЭКАП ═══════════════════════════════

/** Снимок всех пользовательских данных (устойчив к версии v1). */
function exportState_() {
  const state = {
    version: VERSION, exportedAt: new Date().toISOString(),
    firstDate: '', habits: {}, xp: {}, params: null, tasks: [], shop: [],
  };

  const h = sheet_(SH.habits);
  if (h && h.getLastRow() >= LAYOUT.FIRST_ROW) {
    const lastCol = h.getLastColumn();
    const header = h.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    let end = header.indexOf('XP');
    if (end < 0) end = lastCol;
    const names = header.slice(2, end);
    const rows = h.getLastRow() - LAYOUT.FIRST_ROW + 1;
    const data = h.getRange(LAYOUT.FIRST_ROW, 1, rows, end).getValues();
    // Если даты не вычислились (например, #ERROR! в v1), восстанавливаем их из формулы первой строки
    const firstF = U.isoFromFormula(h.getRange(LAYOUT.FIRST_ROW, 1).getFormula());
    data.forEach((r, i) => {
      const iso = U.isoOrEmpty(r[0]) || (firstF ? U.addDays(U.parts(firstF), i).map((v, k) => k ? ('0' + v).slice(-2) : v).join('-') : '');
      if (!iso) return;
      if (!state.firstDate || iso < state.firstDate) state.firstDate = iso;
      const done = names.filter((n, j) => r[2 + j] === true);
      if (done.length) state.habits[iso] = done;
    });
  }

  const c = sheet_(SH.cfg);
  if (c && c.getLastRow() >= 2) {
    c.getRange(2, 1, c.getLastRow() - 1, 2).getValues().forEach(([n, x]) => {
      if (n !== '' && x !== '' && Number.isFinite(Number(x))) state.xp[String(n)] = Number(x);
    });
    const p = c.getRange('F2:F4').getValues().map(r => Number(r[0]));
    if (p.every(v => Number.isFinite(v) && v > 0)) state.params = p;
  }

  const t = sheet_(SH.tasks);
  if (t && t.getLastRow() >= 2) {
    const w = Math.min(8, t.getMaxColumns());
    const rg = t.getRange(2, 1, t.getLastRow() - 1, w);
    const fs = rg.getFormulas();
    rg.getValues().forEach((r, i) => {
      if (!String(r[1]).trim()) return;
      const dl = U.isoOrEmpty(r[3]) || U.isoFromFormula(fs[i][3]);
      const dn = w >= 8 ? (U.isoOrEmpty(r[7]) || U.isoFromFormula(fs[i][7])) : '';
      state.tasks.push([r[0] === true, String(r[1]), String(r[2] || ''), dl,
        String(r[4] || ''), Number(r[5]) || 0, String(r[6] || ''), dn]);
    });
  }

  const s = sheet_(SH.shop);
  if (s && s.getLastRow() >= 2) {
    const w = Math.min(4, s.getMaxColumns());
    const rg = s.getRange(2, 1, s.getLastRow() - 1, w);
    const fs = rg.getFormulas();
    rg.getValues().forEach((r, i) => {
      if (!String(r[0]).trim()) return;
      state.shop.push([String(r[0]), Number(r[1]) || 0, r[2] === true,
        w >= 4 ? (U.isoOrEmpty(r[3]) || U.isoFromFormula(fs[i][3])) : '']);
    });
  }
  return state;
}

/** Резервная копия в скрытый лист (JSON, разбит на куски, хранится как текст). */
function writeBackup_(state) {
  const ss = ss_();
  let sh = ss.getSheetByName(SH.backup);
  if (!sh) sh = ss.insertSheet(SH.backup, ss.getNumSheets());
  sh.clear();
  const json = JSON.stringify(state);
  const chunks = [];
  for (let i = 0; i < json.length; i += LAYOUT.BACKUP_CHUNK) chunks.push(["'" + json.slice(i, i + LAYOUT.BACKUP_CHUNK)]);
  if (sh.getMaxRows() < chunks.length + 1) sh.insertRowsAfter(sh.getMaxRows(), chunks.length + 1 - sh.getMaxRows());
  sh.getRange(1, 1, chunks.length + 1, 1).setNumberFormat('@');
  sh.getRange(1, 1, 1, 3).setValues([['Резервная копия Daily Quest — не редактируй этот лист', state.exportedAt, VERSION]]);
  sh.getRange(2, 1, chunks.length, 1).setValues(chunks);
  if (!sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) {
    sh.protect().setDescription('DQ: резервная копия').setWarningOnly(true);
  }
  if (ss.getSheets().filter(x => !x.isSheetHidden()).length > 1) sh.hideSheet();
  PropertiesService.getDocumentProperties().setProperty('dq_last_backup', new Date().toISOString());
}

function readBackup_() {
  const sh = sheet_(SH.backup);
  if (!sh || sh.getLastRow() < 2) return null;
  const json = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])).join('');
  try {
    const st = JSON.parse(json);
    return (st && typeof st === 'object' && st.habits) ? st : null;
  } catch (e) {
    console.error('backup parse', e);
    return null;
  }
}

// ═══════════════════════════════ СБОРКА ═══════════════════════════════

function buildAll_(state) {
  validateConfig_();
  const ss = ss_();
  ss.setSpreadsheetTimeZone(CFG.timezone);
  ss.setSpreadsheetLocale('en_US');      // формулы ниже — в синтаксисе en_US
  SpreadsheetApp.flush();

  // Удаляем всё, кроме резервной копии
  const tmp = ss.insertSheet('__tmp_' + Date.now());
  ss.getSheets().forEach(s => {
    if (s.getSheetId() !== tmp.getSheetId() && s.getName() !== SH.backup) ss.deleteSheet(s);
  });
  const sheets = {};
  [['dash', SH.dash], ['habits', SH.habits], ['tasks', SH.tasks], ['shop', SH.shop], ['cfg', SH.cfg]]
    .forEach(([k, n], i) => { sheets[k] = ss.insertSheet(n, i); });
  ss.deleteSheet(tmp);

  // Период: от самой ранней сохранённой даты (или сегодня) + daysToCreate вперёд
  const today = U.todayParts();
  let start = today;
  if (state && state.firstDate) {
    const fp = U.parts(state.firstDate);
    if (U.diffDays(fp, today) > 0) start = fp;
  }
  const days = U.diffDays(start, today) + CFG.daysToCreate;

  buildSettings_(sheets.cfg, state);
  buildHabits_(sheets.habits, start, days);
  buildTasks_(sheets.tasks, state);
  buildShop_(sheets.shop, state);
  buildDashboard_(sheets.dash);
  SpreadsheetApp.flush();

  if (state) restoreHabits_(sheets.habits, state);

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

function habitCols_() {
  const n = CFG.habits.length;
  const first = 3, last = 2 + n;
  return { n, first, last, xp: last + 1, pct: last + 2, streak: last + 3, width: last + 3 };
}

// ---------- Настройки ----------
function buildSettings_(sh, state) {
  const rows = CFG.habits.map(([n, xp, d]) => [
    n, (state && state.xp && state.xp[n] != null) ? state.xp[n] : xp, DAYLABELS[d],
  ]);
  const params = (state && state.params) ? state.params : [CFG.xpPerLevel, CFG.coinsPerXp, CFG.streakThreshold];
  trimSheet_(sh, rows.length + 13, 8);

  sh.getRange(1, 1, 1, 3).setValues([['Привычка', 'XP', 'Дни']]);
  sh.getRange(2, 1, rows.length, 3).setValues(rows);
  sh.getRange(1, 5, 4, 2).setValues([
    ['Параметр', 'Значение'],
    ['XP на уровень', params[0]],
    ['Монет за 1 XP', params[1]],
    ['Порог дня для серии', params[2]],
  ]);
  sh.getRange('H1:H6').setValues([
    ['💡 Как пользоваться'],
    ['• XP за привычку меняется в колонке B — всё пересчитается само.'],
    ['• Справа: XP на уровень, монеты за 1 XP, порог серии (доля выполненных привычек).'],
    ['• Новая привычка: впиши строку под списком (название, XP, дни), затем меню «♻️ Пересобрать».'],
    ['• Перед каждой пересборкой автоматически сохраняется резервная копия.'],
    ['• Скрипт работает только с этой таблицей (@OnlyCurrentDoc).'],
  ]);
  sh.getRange(2, 3, rows.length + 12, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.keys(DAYLABELS).map(k => DAYLABELS[k]), true).setAllowInvalid(false)
    .setHelpText('Выбери дни из списка').build());
  sh.getRange(2, 2, rows.length + 12, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 1000).setAllowInvalid(false).setHelpText('XP: число от 0 до 1000').build());
  sh.getRange('F2').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 1000000).setAllowInvalid(false).build());
  sh.getRange('F3').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 100).setAllowInvalid(false).build());
  sh.getRange('F4').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0.01, 1).setAllowInvalid(false).setHelpText('Например 0.8 = 80 %').build());
  sh.getRange('F4').setNumberFormat('0%');
}

// ---------- Привычки ----------
function buildHabits_(sh, start, days) {
  const c = habitCols_();
  trimSheet_(sh, LAYOUT.FIRST_ROW - 1 + days, c.width);
  const header = ['Дата', 'День'].concat(CFG.habits.map(h => h[0]), ['XP', 'Выполнено', 'Серия']);
  const xpRow = ['', 'XP'].concat(CFG.habits.map((h, i) => '=' + U.q(SH.cfg) + '!B' + (i + 2)), ['', '', '']);
  sh.getRange(1, 1, 1, c.width).setValues([header]);
  sh.getRange(2, 1, 1, c.width).setValues([xpRow]);
  appendDays_(sh, days, start, true);
}

/** Добавляет n дней в конец листа (или с даты start, если лист пустой). */
function appendDays_(sh, n, start, forceFresh) {
  const c = habitCols_();
  const last = sh.getLastRow();
  const fresh = forceFresh === true || last < LAYOUT.FIRST_ROW;
  let base;
  if (fresh) {
    base = start || U.todayParts();
  } else {
    const lastIso = lastDateIso_(sh);
    if (!lastIso) throw new Error('Не удалось прочитать последнюю дату на листе «' + SH.habits + '».');
    base = U.addDays(U.parts(lastIso), 1);
  }
  const startRow = fresh ? LAYOUT.FIRST_ROW : last + 1;
  ensureRows_(sh, startRow + n - 1);

  // Даты и дни недели
  const ab = [];
  for (let i = 0; i < n; i++) {
    const dateF = (i === 0 && fresh) ? '=DATE(' + base[0] + ',' + base[1] + ',' + base[2] + ')' : '=R[-1]C+1';
    ab.push([dateF, '=CHOOSE(WEEKDAY(RC1,2),"Пн","Вт","Ср","Чт","Пт","Сб","Вс")']);
  }
  sh.getRange(startRow, 1, n, 2).setFormulasR1C1(ab);

  // Галочки: активные дни — чекбоксы, неактивные — «—»
  const block = sh.getRange(startRow, c.first, n, c.n);
  block.setValues(U.fill(n, c.n, false));
  block.insertCheckboxes();
  const inactive = [];
  for (let i = 0; i < n; i++) {
    const wd = U.weekday(U.addDays(base, i));
    CFG.habits.forEach((h, j) => {
      if (!DAYSETS[h[2]][wd]) inactive.push(U.col(c.first + j) + (startRow + i));
    });
  }
  if (inactive.length) {
    sh.getRangeList(inactive).removeCheckboxes();
    sh.getRangeList(inactive).setValue('—');
  }

  // XP, % выполнения, серия
  const r = 'RC' + c.first + ':RC' + c.last;
  const xpF = '=SUMPRODUCT(--(' + r + '=TRUE),R2C' + c.first + ':R2C' + c.last + ')';
  const pctF = '=IFERROR(COUNTIF(' + r + ',TRUE)/(COUNTIF(' + r + ',TRUE)+COUNTIF(' + r + ',FALSE)),0)';
  const stF = '=IF(RC1>TODAY(),"",IF(RC[-1]>=' + U.q(SH.cfg) + '!R4C6,N(R[-1]C)+1,0))';
  sh.getRange(startRow, c.xp, n, 3).setFormulasR1C1(U.fill(n, 1, null).map(() => [xpF, pctF, stF]));
}

/** Последняя дата на листе «Привычки» (с запасным вариантом через формулу первой строки). */
function lastDateIso_(sh) {
  const last = sh.getLastRow();
  if (last < LAYOUT.FIRST_ROW) return '';
  const direct = U.isoOrEmpty(sh.getRange(last, 1).getValue());
  if (direct) return direct;
  const first = U.isoFromFormula(sh.getRange(LAYOUT.FIRST_ROW, 1).getFormula());
  if (!first) return '';
  return U.addDays(U.parts(first), last - LAYOUT.FIRST_ROW).map((v, k) => k ? ('0' + v).slice(-2) : v).join('-');
}

function restoreHabits_(sh, state) {
  const c = habitCols_();
  const rows = sh.getLastRow() - LAYOUT.FIRST_ROW + 1;
  if (rows < 1) return;
  const names = CFG.habits.map(h => h[0]);
  const dates = sh.getRange(LAYOUT.FIRST_ROW, 1, rows, 1).getValues();
  const block = sh.getRange(LAYOUT.FIRST_ROW, c.first, rows, c.n);
  const vals = block.getValues();
  let changed = 0, lost = 0;
  dates.forEach((d, i) => {
    const list = state.habits[U.isoOrEmpty(d[0])];
    if (!list) return;
    list.forEach(nm => {
      const j = names.indexOf(nm);
      if (j >= 0 && vals[i][j] === false) { vals[i][j] = true; changed++; } else if (j < 0) lost++;
    });
  });
  if (changed) block.setValues(vals);
  if (lost) notify_('ℹ️ ' + lost + ' отметок не перенесено: этих привычек больше нет в списке.', 10);
}

function findDateRow_(sh, iso) {
  const rows = sh.getLastRow() - LAYOUT.FIRST_ROW + 1;
  if (rows < 1) return 0;
  const vals = sh.getRange(LAYOUT.FIRST_ROW, 1, rows, 1).getValues();
  for (let i = 0; i < vals.length; i++) if (U.isoOrEmpty(vals[i][0]) === iso) return LAYOUT.FIRST_ROW + i;
  return 0;
}

// ---------- Задачи ----------
function buildTasks_(sh, state) {
  const src = state
    ? state.tasks
    : CFG.tasks.map(t => [false, t[0], t[1], t[2], t[3], t[4], '', '']);
  const total = Math.max(LAYOUT.TASK_ROWS, src.length + 50);
  trimSheet_(sh, total + 1, 9);

  sh.getRange(1, 1, 1, 8).setValues([['✓', 'Задача', 'Категория', 'Дедлайн', 'Приоритет', 'XP', 'Заметки', 'Выполнено']]);
  sh.getRange('I1').setFormula(
    '={"⏳ Осталось";ARRAYFORMULA(IF((B2:B="")+(A2:A=TRUE)+(D2:D=""),"",IFERROR(INT(D2:D)-TODAY(),"")))}');

  const rows = src.map(r => [r[0] === true, r[1], r[2], U.dateF(r[3]), r[4], r[5] || 20, r[6] || '', U.dateF(r[7])]);
  if (rows.length) sh.getRange(2, 1, rows.length, 8).setValues(rows);
  const empty = total - rows.length;
  if (empty > 0) {
    sh.getRange(2 + rows.length, 1, empty, 1).setValues(U.fill(empty, 1, false));
    sh.getRange(2 + rows.length, 6, empty, 1).setValues(U.fill(empty, 1, 20));
  }
  sh.getRange(2, 1, total, 1).insertCheckboxes();

  const dv = SpreadsheetApp.newDataValidation;
  sh.getRange(2, 3, total, 1).setDataValidation(dv().requireValueInList(CFG.categories, true).setAllowInvalid(true).build());
  sh.getRange(2, 4, total, 1).setDataValidation(dv().requireDate().setAllowInvalid(false)
    .setHelpText('Введи дату, например 25.10.2026').build());
  sh.getRange(2, 5, total, 1).setDataValidation(dv().requireValueInList(PRIORITIES, true).setAllowInvalid(true).build());
  sh.getRange(2, 6, total, 1).setDataValidation(dv().requireNumberBetween(0, 500).setAllowInvalid(false)
    .setHelpText('XP за задачу: 0–500').build());
  sh.getRange(2, 4, total, 1).setNumberFormat('dd.mm.yyyy');
  sh.getRange(2, 8, total, 1).setNumberFormat('dd.mm.yyyy');
  sh.getRange(2, 9, total, 1).setNumberFormat('"через "0" дн.";"просрочено "0" дн.";"сегодня"');
  sh.getRange(1, 1, total + 1, 9).createFilter();
}

// ---------- Магазин ----------
function buildShop_(sh, state) {
  const src = state ? state.shop : CFG.rewards.map(r => [r[0], r[1], false, '']);
  const total = Math.max(LAYOUT.SHOP_ROWS, src.length + 20);
  trimSheet_(sh, total + 1, 7);
  sh.getRange(1, 1, 1, 4).setValues([['Награда', 'Цена 🪙', 'Куплено', 'Дата']]);
  const rows = src.map(r => [r[0], r[1], r[2] === true, U.dateF(r[3])]);
  if (rows.length) sh.getRange(2, 1, rows.length, 4).setValues(rows);
  const empty = total - rows.length;
  if (empty > 0) sh.getRange(2 + rows.length, 3, empty, 1).setValues(U.fill(empty, 1, false));
  sh.getRange(2, 3, total, 1).insertCheckboxes();
  sh.getRange(2, 2, total, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 100000).setAllowInvalid(false).setHelpText('Цена в монетах').build());
  sh.getRange(2, 4, total, 1).setNumberFormat('dd.mm.yyyy');

  const D6 = U.q(SH.dash) + '!D6';
  sh.getRange('F1:G3').setValues([
    ['🪙 Баланс', '=' + U.q(SH.dash) + '!F6'],
    ['Заработано', '=FLOOR(' + D6 + '*' + U.q(SH.cfg) + '!F3)'],
    ['Потрачено', '=SUMIF(C2:C,TRUE,B2:B)'],
  ]);
  sh.getRange('F5').setValue('Отметь «Куплено», когда тратишь монеты. Если монет не хватает, покупка отменится сама. ' +
    'Свои награды добавляй в свободные строки.');
}

// ---------- Дашборд ----------
function buildDashboard_(sh) {
  const c = habitCols_();
  const n = CFG.habits.length;
  trimSheet_(sh, Math.max(D.HAB + n + 2, D.CAT_H + CFG.categories.length + 2), 26);

  const hS = U.q(SH.habits), tS = U.q(SH.tasks), sS = U.q(SH.shop), cS = U.q(SH.cfg);
  const xpL = U.col(c.xp), pctL = U.col(c.pct), stL = U.col(c.streak);
  const FR = LAYOUT.FIRST_ROW;
  const at = (col, day) => 'IFERROR(INDEX(' + hS + '!' + col + ':' + col + ',MATCH(' + day + ',' + hS + '!A:A,0)),0)';
  const todayPct = at(pctL, 'TODAY()');
  const per = cS + '!$F$2', coin = cS + '!$F$3', thr = cS + '!$F$4';
  const spent = 'SUMIF(' + sS + '!C2:C,TRUE,' + sS + '!B2:B)';
  const earned = 'FLOOR(D6*' + coin + ')';
  const last7 = hS + '!A:A,"<="&TODAY(),' + hS + '!A:A,">"&(TODAY()-7)';
  const shopGid = sheet_(SH.shop).getSheetId();
  const taskGid = sheet_(SH.tasks).getSheetId();
  const habGid = sheet_(SH.habits).getSheetId();
  const cond = tS + '!A2:A=FALSE,' + tS + '!B2:B<>"",ISNUMBER(' + tS + '!D2:D)';
  const ranks = RANKS.map(r => '"' + r + '"').join(',');

  const cells = {
    B2: '🎮 DAILY QUEST',
    B3: '="Уровень "&B6&" · "&B7&" · "&TEXT(TODAY(),"dd.mm.yyyy")&" · серия "&D11&" дн."',

    B5: '⭐ УРОВЕНЬ', D5: '✨ ВСЕГО XP', F5: '🪙 МОНЕТЫ',
    B6: '=INT(D6/' + per + ')+1',
    D6: '=SUM(' + hS + '!' + xpL + FR + ':' + xpL + ')+SUMIF(' + tS + '!A2:A,TRUE,' + tS + '!F2:F)',
    F6: '=' + earned + '-' + spent,
    B7: '=CHOOSE(MIN(B6,10),' + ranks + ')',
    D7: '=SPARKLINE(MOD(D6,' + per + '),{"charttype","bar";"max",' + per + ';"color1","' + TH.green + '"})',
    F7: '=HYPERLINK("#gid=' + shopGid + '","🛒 открыть магазин →")',
    B8: '="до уровня "&(B6+1)&": "&(' + per + '-MOD(D6,' + per + '))&" XP"',
    D8: '=MOD(D6,' + per + ')&" / "&' + per + '&" XP на уровне"',
    F8: '="заработано "&' + earned + '&" · потрачено "&' + spent,

    B10: '📅 СЕГОДНЯ, XP', D10: '🔥 СЕРИЯ, ДНЕЙ', F10: '📈 СРЕДНЕЕ ЗА 7 ДНЕЙ',
    B11: '=' + at(xpL, 'TODAY()'),
    D11: '=MAX(N(' + at(stL, 'TODAY()') + '),N(' + at(stL, 'TODAY()-1') + '))',
    F11: '=IFERROR(AVERAGEIFS(' + hS + '!' + pctL + ':' + pctL + ',' + last7 + '),0)',
    B12: '=SPARKLINE(' + todayPct + ',{"charttype","bar";"max",1;"color1","' + TH.green + '"})',
    D12: '="подряд с выполнением ≥ "&TEXT(' + thr + ',"0%")',
    F12: '=SPARKLINE(F11,{"charttype","bar";"max",1;"color1","' + TH.accent + '"})',
    B13: '=TEXT(' + todayPct + ',"0%")&" привычек на сегодня"',
    D13: '="рекорд: "&MAX(' + hS + '!' + stL + FR + ':' + stL + ')&" дн."',
    F13: '="XP за неделю: "&SUMIFS(' + hS + '!' + xpL + ':' + xpL + ',' + last7 + ')',

    B15: '⏰ ПРОСРОЧЕНО', D15: '⚡ ДЕДЛАЙН ≤ 3 ДНЕЙ', F15: '📋 ОТКРЫТО ЗАДАЧ',
    B16: '=COUNTIFS(' + tS + '!A2:A,FALSE,' + tS + '!B2:B,"<>",' + tS + '!D2:D,"<"&TODAY())',
    D16: '=COUNTIFS(' + tS + '!A2:A,FALSE,' + tS + '!B2:B,"<>",' + tS + '!D2:D,">="&TODAY(),' + tS + '!D2:D,"<"&(TODAY()+4))',
    F16: '=COUNTIFS(' + tS + '!A2:A,FALSE,' + tS + '!B2:B,"<>")',
    B17: 'задач с прошедшим дедлайном',
    D17: 'нужно сделать в ближайшие дни',
    F17: '="выполнено: "&COUNTIFS(' + tS + '!A2:A,TRUE,' + tS + '!B2:B,"<>")',
  };
  cells['B' + D.TASKS_H] = '=HYPERLINK("#gid=' + taskGid + '","🎯 БЛИЖАЙШИЕ ЗАДАЧИ →")';
  cells['D' + D.TASKS_H] = 'ДЕДЛАЙН';
  cells['F' + D.TASKS_H] = 'ОСТАЛОСЬ';
  cells['B' + D.TASKS] = '=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER(' + tS + '!B2:B,' + cond + '),FILTER(' + tS + '!D2:D,' + cond +
    '),TRUE),' + LAYOUT.TASK_LIST + ',1),"Нет открытых задач с дедлайном 🎉")';
  cells['D' + D.TASKS] = '=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER(' + tS + '!D2:D,' + cond + '),1,TRUE),' + LAYOUT.TASK_LIST + ',1),"")';
  const tEnd = D.TASKS + LAYOUT.TASK_LIST - 1;
  cells['F' + D.TASKS] = '=ARRAYFORMULA(IF(ISNUMBER(D' + D.TASKS + ':D' + tEnd + '),INT(D' + D.TASKS + ':D' + tEnd + ')-TODAY(),""))';

  cells['B' + D.HAB_H] = '=HYPERLINK("#gid=' + habGid + '","📊 ПРИВЫЧКИ ЗА 30 ДНЕЙ →")';
  cells['D' + D.HAB_H] = 'ПРОГРЕСС';
  cells['F' + D.HAB_H] = 'ВЫПОЛНЕНО';
  const win = hS + '!$A$' + FR + ':$A,">"&(TODAY()-30),' + hS + '!$A$' + FR + ':$A,"<="&TODAY()';
  CFG.habits.forEach((h, i) => {
    const r = D.HAB + i, L = U.col(c.first + i);
    const yes = 'COUNTIFS(' + hS + '!' + L + '$' + FR + ':' + L + ',TRUE,' + win + ')';
    const no = 'COUNTIFS(' + hS + '!' + L + '$' + FR + ':' + L + ',FALSE,' + win + ')';
    cells['B' + r] = '=' + cS + '!A' + (i + 2);
    cells['F' + r] = '=IFERROR(' + yes + '/(' + yes + '+' + no + '),0)';
    cells['D' + r] = '=SPARKLINE(F' + r + ',{"charttype","bar";"max",1;"color1",IF(F' + r + '>=0.8,"' + TH.green +
      '",IF(F' + r + '>=0.5,"' + TH.yellow + '","' + TH.red + '"))})';
  });

  // Скрытые данные для диаграмм (X:Z)
  cells.X2 = 'Дата'; cells.Y2 = 'XP'; cells.Z2 = 'Выполнено';
  cells.X3 = '=SEQUENCE(30,1,TODAY()-29,1)';
  cells.Y3 = '=ARRAYFORMULA(IFERROR(VLOOKUP(X3:X32,' + hS + '!A' + FR + ':' + pctL + ',' + c.xp + ',FALSE),0))';
  cells.Z3 = '=ARRAYFORMULA(IFERROR(VLOOKUP(X3:X32,' + hS + '!A' + FR + ':' + pctL + ',' + c.pct + ',FALSE),0))';
  cells['X' + D.CAT_H] = 'Категория';
  cells['Y' + D.CAT_H] = 'Открыто';
  CFG.categories.forEach((cat, i) => {
    const r = D.CAT_H + 1 + i;
    cells['X' + r] = cat;
    cells['Y' + r] = '=COUNTIFS(' + tS + '!C2:C,X' + r + ',' + tS + '!A2:A,FALSE,' + tS + '!B2:B,"<>")';
  });

  Object.keys(cells).forEach(a1 => {
    const v = cells[a1];
    const rg = sh.getRange(a1);
    if (typeof v === 'string' && v.charAt(0) === '=') rg.setFormula(v); else rg.setValue(v);
  });

  // Форматы чисел
  sh.getRange('D6').setNumberFormat('#,##0');
  sh.getRange('F6').setNumberFormat('#,##0');
  sh.getRange('F11').setNumberFormat('0%');
  sh.getRange('D' + D.TASKS + ':D' + tEnd).setNumberFormat('dd.mm.yyyy');
  sh.getRange('F' + D.TASKS + ':F' + tEnd).setNumberFormat('"через "0" дн.";"просрочено "0" дн.";"сегодня"');
  sh.getRange('F' + D.HAB + ':F' + (D.HAB + n - 1)).setNumberFormat('0%');
  sh.getRange('X3:X32').setNumberFormat('dd.mm');
  sh.getRange('Z3:Z32').setNumberFormat('0%');
}

// ═══════════════════════════════ ОФОРМЛЕНИЕ ═══════════════════════════════

function styleAll_() {
  const map = [
    [SH.cfg, styleSettings_], [SH.habits, styleHabits_], [SH.tasks, styleTasks_],
    [SH.shop, styleShop_], [SH.dash, styleDashboard_],
  ];
  SpreadsheetApp.flush();
  map.forEach(([name, fn]) => { const sh = sheet_(name); if (sh) fn(sh); });
  const tabs = { [SH.dash]: '#8ea2ff', [SH.habits]: '#4ade80', [SH.tasks]: '#60a5fa', [SH.shop]: '#facc15', [SH.cfg]: '#6b7280' };
  Object.keys(tabs).forEach(n => { const sh = sheet_(n); if (sh) sh.setTabColor(tabs[n]); });
}

/** Базовый тёмный фон для всего листа. */
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

/** Подгоняет ширину колонки под текст с ограничением min/max. */
function fitColumn_(sh, col, min, max) {
  sh.autoResizeColumns(col, 1);
  sh.setColumnWidth(col, U.clamp(sh.getColumnWidth(col) + 18, min, max));
}

/** Ширина колонки привычки по заголовку (перенос в 2–3 строки). */
function headerWidth_(text) {
  const s = String(text);
  const longest = Math.max.apply(null, s.split(/\s+/).map(w => w.length));
  return U.clamp(Math.round(Math.max(longest * 7.8, s.length * 7.8 / 2.2) + 22), 84, 150);
}

function cf_() { return SpreadsheetApp.newConditionalFormatRule(); }

// ---------- Настройки ----------
function styleSettings_(sh) {
  baseStyle_(sh);
  const n = CFG.habits.length;
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
  sh.getRange('H2:H6').setFontColor(TH.muted).setWrap(true);
  fitColumn_(sh, 1, 200, 340);
  sh.setColumnWidth(2, 70); sh.setColumnWidth(3, 110); sh.setColumnWidth(4, 24);
  fitColumn_(sh, 5, 150, 240);
  sh.setColumnWidth(6, 90); sh.setColumnWidth(7, 24); sh.setColumnWidth(8, 460);
  sh.setRowHeights(1, sh.getMaxRows(), 26);
  sh.setFrozenRows(1);
}

// ---------- Привычки ----------
function styleHabits_(sh) {
  const c = habitCols_();
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
  sh.getRange(FR, 1, rows, 1).setFontColor(TH.muted).setNumberFormat('dd.mm.yy');
  sh.getRange(FR, 2, rows, 1).setFontColor(TH.dim).setFontSize(9);
  sh.getRange(FR, c.first, rows, c.n).setFontColor(TH.faint);          // цвет пустого чекбокса
  sh.getRange(FR, c.xp, rows, 1).setFontWeight('bold').setNumberFormat('0;-0;""');
  sh.getRange(FR, c.pct, rows, 1).setNumberFormat('0%');
  sh.getRange(FR, c.streak, rows, 1).setFontColor(TH.orange).setFontWeight('bold').setNumberFormat('"🔥 "0;-0;""');
  sh.getRange(1, c.xp, rows + FR - 1, 1)
    .setBorder(null, true, null, null, null, null, TH.border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // Размеры
  sh.setColumnWidth(1, 76); sh.setColumnWidth(2, 40);
  CFG.habits.forEach((h, j) => sh.setColumnWidth(c.first + j, headerWidth_(h[0])));
  sh.setColumnWidth(c.xp, 58); sh.setColumnWidth(c.pct, 92); sh.setColumnWidth(c.streak, 80);
  SpreadsheetApp.flush();
  sh.autoResizeRows(1, 1);
  if (sh.getRowHeight(1) < 52) sh.setRowHeight(1, 52);
  sh.setRowHeight(2, 22);
  sh.setRowHeights(FR, rows, 26);
  sh.setFrozenRows(2);
  sh.setFrozenColumns(2);

  // Условное форматирование (порядок = приоритет)
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

// ---------- Задачи ----------
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
    cf_().whenTextEqualTo('🔥 Высокий').setFontColor(TH.red).setBold(true).setRanges([sh.getRange(2, 5, rows, 1)]).build(),
    cf_().whenFormulaSatisfied('=ISEVEN(ROW())').setBackground(TH.zebra).setRanges([ALL]).build(),
  ]);
}

// ---------- Магазин ----------
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

// ---------- Дашборд ----------
function styleDashboard_(sh) {
  const n = CFG.habits.length;
  baseStyle_(sh);

  // Сетка: гуттеры A, C, E, G; карточки B, D, F; диаграммы справа (H…)
  [[1, 22], [2, 270], [3, 14], [4, 170], [5, 14], [6, 170], [7, 24]].forEach(([c, w]) => sh.setColumnWidth(c, w));
  for (let col = 8; col <= 23; col++) sh.setColumnWidth(col, 60);
  [24, 25, 26].forEach(col => sh.setColumnWidth(col, 70));

  const heights = { 1: 14, 2: 46, 3: 22, 4: 12, 9: 12, 14: 12, 18: 18, 28: 18 };
  [D.C1, D.C2].forEach(r => { heights[r] = 24; heights[r + 1] = 46; heights[r + 2] = 22; heights[r + 3] = 22; });
  heights[D.C3] = 24; heights[D.C3 + 1] = 46; heights[D.C3 + 2] = 22;
  heights[D.TASKS_H] = 30; heights[D.HAB_H] = 30;
  Object.keys(heights).forEach(r => sh.setRowHeight(Number(r), heights[r]));
  for (let r = D.HAB; r < D.HAB + n; r++) sh.setRowHeight(r, 26);

  // Заголовок
  sh.getRange('B2:F2').merge().setFontSize(22).setFontWeight('bold').setFontColor(TH.text);
  sh.getRange('B3:F3').merge().setFontColor(TH.muted).setFontSize(10);

  // Карточки
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

  // Секции
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
  SpreadsheetApp.flush();
  sh.autoResizeRows(D.TASKS, LAYOUT.TASK_LIST);

  // Скрытые данные — цвет текста = цвет фона
  sh.getRange(1, 24, sh.getMaxRows(), 3).setFontColor(TH.bg);

  sh.setConditionalFormatRules([
    cf_().whenNumberLessThan(0).setFontColor(TH.red).setBold(true).setRanges([sh.getRange('F' + D.TASKS + ':F' + tEnd)]).build(),
    cf_().whenNumberLessThanOrEqualTo(3).setFontColor(TH.yellow).setRanges([sh.getRange('F' + D.TASKS + ':F' + tEnd)]).build(),
    cf_().whenNumberGreaterThan(3).setFontColor(TH.green).setRanges([sh.getRange('F' + D.TASKS + ':F' + tEnd)]).build(),
    cf_().whenNumberGreaterThanOrEqualTo(0.8).setFontColor(TH.green).setRanges([sh.getRange(D.HAB, 6, n, 1)]).build(),
    cf_().whenNumberGreaterThanOrEqualTo(0.5).setFontColor(TH.yellow).setRanges([sh.getRange(D.HAB, 6, n, 1)]).build(),
    cf_().whenNumberLessThan(0.5).setFontColor(TH.red).setRanges([sh.getRange(D.HAB, 6, n, 1)]).build(),
    cf_().whenNumberGreaterThan(0).setFontColor(TH.red).setRanges([sh.getRange('B16')]).build(),
    cf_().whenNumberEqualTo(0).setFontColor(TH.green).setRanges([sh.getRange('B16')]).build(),
  ]);

  // Диаграммы (пересоздаются при каждом оформлении)
  sh.getCharts().forEach(ch => sh.removeChart(ch));
  const axisText = { color: TH.muted, fontSize: 10 };
  sh.insertChart(sh.newChart()
    .setChartType(Charts.ChartType.COMBO)
    .addRange(sh.getRange('X2:Z32'))
    .setNumHeaders(1)
    .setPosition(2, 8, 0, 0)
    .setOption('title', 'XP и выполнение за 30 дней')
    .setOption('titleTextStyle', { color: TH.text, fontSize: 14, bold: true })
    .setOption('backgroundColor', TH.surface)
    .setOption('chartArea', { backgroundColor: TH.surface, left: 50, right: 50, top: 56, bottom: 44 })
    .setOption('legend', { position: 'top', textStyle: axisText })
    .setOption('hAxis', { textStyle: axisText, format: 'dd.MM', gridlines: { color: 'transparent' } })
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
    .addRange(sh.getRange('X' + D.CAT_H + ':Y' + (D.CAT_H + CFG.categories.length)))
    .setNumHeaders(1)
    .setPosition(D.TASKS_H, 8, 0, 0)
    .setOption('title', 'Открытые задачи по категориям')
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

// ═══════════════════════════════ ЗАЩИТА ═══════════════════════════════

/** Мягкая защита формул: при правке Google покажет предупреждение. */
function protectAll_() {
  const warn = (range, desc) => range.protect().setDescription('DQ: ' + desc).setWarningOnly(true);
  const c = habitCols_();
  const h = sheet_(SH.habits), t = sheet_(SH.tasks), d = sheet_(SH.dash), s = sheet_(SH.shop);
  if (d) d.protect().setDescription('DQ: дашборд считается автоматически').setWarningOnly(true);
  if (h) {
    warn(h.getRange(1, 1, 2, c.width), 'заголовки и XP привычек');
    warn(h.getRange(LAYOUT.FIRST_ROW, 1, h.getMaxRows() - LAYOUT.FIRST_ROW + 1, 2), 'даты');
    warn(h.getRange(LAYOUT.FIRST_ROW, c.xp, h.getMaxRows() - LAYOUT.FIRST_ROW + 1, 3), 'формулы XP / % / серия');
  }
  if (t) warn(t.getRange(1, 9, t.getMaxRows(), 1), 'колонка «Осталось» считается сама');
  if (s) warn(s.getRange('F1:G3'), 'баланс считается сам');
}

// ═══════════════════════════════ ИГРОВЫЕ РЕАКЦИИ (onEdit) ═══════════════════════════════

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const r = e.range;
    if (r.getNumRows() !== 1 || r.getNumColumns() !== 1) return;
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
  if (pct >= 1) notify_('🏆 День закрыт на 100 %! Так держать.', 6);
}

function onTaskEdit_(sh, r) {
  const row = r.getRow(), col = r.getColumn();
  if (row < 2 || col !== 1) return;
  const title = String(sh.getRange(row, 2).getValue()).trim();
  const done = sh.getRange(row, 8);
  if (r.getValue() === true) {
    if (!title) { r.setValue(false); notify_('Сначала впиши задачу в колонку «Задача».'); return; }
    done.setValue(new Date()).setNumberFormat('dd.mm.yyyy');
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
  if (!name) { r.setValue(false); notify_('Сначала впиши награду.'); return; }
  SpreadsheetApp.flush();
  const balance = Number(sheet_(SH.dash).getRange('F6').getValue());
  if (!Number.isFinite(balance) || balance < 0) {
    r.setValue(false);
    notify_('🪙 Не хватает ' + Math.abs(Math.round(balance)) + ' монет на «' + name + '». Ещё немного квестов!', 8);
    return;
  }
  date.setValue(new Date()).setNumberFormat('dd.mm.yyyy');
  notify_('🛒 Куплено: ' + name + '. Остаток: ' + balance + ' 🪙', 6);
}

function celebrate_(xp, title) {
  if (!xp) return;
  SpreadsheetApp.flush();
  const total = Number(sheet_(SH.dash).getRange('D6').getValue()) || 0;
  const per = Number(sheet_(SH.cfg).getRange('F2').getValue()) || CFG.xpPerLevel;
  const lvlNow = Math.floor(total / per) + 1;
  const lvlBefore = Math.floor((total - xp) / per) + 1;
  if (lvlNow > lvlBefore) {
    notify_('🎉 НОВЫЙ УРОВЕНЬ ' + lvlNow + ': ' + RANKS[Math.min(lvlNow, RANKS.length) - 1] + '!', 10);
  } else {
    notify_((title ? title + '\n' : '') + '+' + xp + ' XP · до уровня ' + (lvlNow + 1) + ': ' + (per - (total % per)) + ' XP', 4);
  }
}
