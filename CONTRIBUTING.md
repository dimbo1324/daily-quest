# Как вести разработку

## Ветки
- `main` — всегда рабочая версия, которую можно вставить в таблицу.
- Работа — в отдельных ветках: `feat/<кратко>`, `fix/<кратко>`, `chore/<кратко>`, затем PR/merge в `main`.

## Коммиты — [Conventional Commits](https://www.conventionalcommits.org/ru/)
`feat:` новая механика · `fix:` исправление · `refactor:` · `docs:` · `chore:` · `ci:` · `build:`

## Цикл работы
1. `git switch -c feat/my-feature`
2. Правишь `src/Code.js` (можно разбивать на несколько `.js` файлов в `src/` — Apps Script видит их как один глобальный scope).
3. `npm run check` — линтер и проверка JSON.
4. `npm run push` — отправка в свою таблицу, проверка вручную.
5. Коммит, push, PR → CI должен быть зелёным → merge.

## Релиз
1. Поднять `VERSION` в `src/Code.js` и `version` в `package.json` (SemVer).
2. Добавить запись в `CHANGELOG.md`.
3. `git tag vX.Y.Z && git push --tags`.

## Никогда не коммить
`my-config.json`, `.clasp.json`, `.clasprc.json`, `.env`, любые ключи/токены. Они в `.gitignore`, а CI дополнительно падает, если такой файл попал в репозиторий.

## Будущие части на Python / Go
Отдельная папка верхнего уровня (`apps/<name>/` или `server/`) со своим тулингом; `.gitignore` и `.editorconfig` уже содержат секции для Python и Go.
