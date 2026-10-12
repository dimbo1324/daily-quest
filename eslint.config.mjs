import js from '@eslint/js';
import { readdirSync, readFileSync } from 'node:fs';

// Google Apps Script runtime globals (V8). Add more here as the code starts using them.
const appsScriptGlobals = [
  'SpreadsheetApp', 'PropertiesService', 'LockService', 'HtmlService', 'Utilities',
  'ScriptApp', 'Session', 'Logger', 'CacheService', 'Browser', 'DriveApp',
  'UrlFetchApp', 'MailApp', 'CalendarApp', 'Charts', 'console',
];

// Apps Script evaluates every file of the project in one global scope, so a top-level
// declaration in one src/ file is a global for all the others. Collect them so `no-undef`
// still catches typos.
const declared = readdirSync('src')
  .filter((f) => f.endsWith('.js'))
  .flatMap((f) => [...readFileSync(`src/${f}`, 'utf8').matchAll(/^(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)])
  .map((m) => m[1]);

const toGlobals = (names, mode) => Object.fromEntries(names.map((g) => [g, mode]));

export default [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...toGlobals(declared, 'writable'), ...toGlobals(appsScriptGlobals, 'readonly') },
    },
    rules: {
      'no-unused-vars': ['warn', { vars: 'local', args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['*.mjs', 'scripts/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { console: 'readonly', process: 'readonly', URL: 'readonly', Buffer: 'readonly' },
    },
  },
];
