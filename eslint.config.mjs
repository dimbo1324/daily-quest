import js from '@eslint/js';

// Google Apps Script runtime globals (V8). Add more here as the code starts using them.
const appsScriptGlobals = Object.fromEntries(
  [
    'SpreadsheetApp', 'PropertiesService', 'LockService', 'HtmlService', 'Utilities',
    'ScriptApp', 'Session', 'Logger', 'CacheService', 'Browser', 'DriveApp',
    'UrlFetchApp', 'MailApp', 'CalendarApp', 'Charts', 'console',
  ].map((g) => [g, 'readonly']),
);

export default [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**'] },
  js.configs.recommended,
  {
    // Apps Script: every top-level function is global (menus, triggers, google.script.run)
    files: ['src/**/*.js', 'src/**/*.gs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: appsScriptGlobals,
    },
    rules: {
      'no-unused-vars': ['warn', { vars: 'local', args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['*.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { console: 'readonly', process: 'readonly' },
    },
  },
];
