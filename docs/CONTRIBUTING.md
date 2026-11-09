# Contributing to NexKey

Доступна русская версия ниже / Russian version below.

## English

Thanks for your interest in the project. NexKey is a compact utility, and even small contributions matter.

### How to help

1. **Bugs** - open an issue with the bug template: OS, NexKey version, steps to reproduce, expected and actual behavior, and if possible the `nexkey.log` content.
2. **Features** - open an issue and describe the scenario first ("I want to run three apps with one key"). Feature ideas are discussed before code.
3. **Code** - fork, create a branch, make the change, test on your platform, open a pull request.
4. **Docs and translations** - fix typos, extend the FAQ, add a new language file in `src/renderer/locales/` and wire it into the language selector.

### Code style

- Vanilla JavaScript, no frameworks in the renderer.
- Main process modules stay free of Electron imports when logic allows it (see `store.js`, `launcher.js`) - this keeps them testable with plain Node.
- Strings never go into the code: all UI text lives in `locales/en.js` and `locales/ru.js`.
- Design stays strict black & white. No new accent colors, no emojis.
- 2-space indent, single quotes, semicolons.

### Local run

```bash
npm install
npm start
```

### Release

Maintainers bump the version, update `CHANGELOG.md`, push a `v*` tag - GitHub Actions builds installers and attaches them to the release automatically.

## Русский

Спасибо за интерес к проекту. NexKey — компактная утилита, и даже небольшой вклад важен.

### Как помочь

1. **Ошибки** — создайте issue по шаблону: ОС, версия NexKey, шаги воспроизведения, ожидаемое и фактическое поведение, по возможности содержимое `nexkey.log`.
2. **Функции** — сначала опишите сценарий («хочу запускать три программы одной клавишей»). Идеи обсуждаются до кода.
3. **Код** — форк, ветка, изменение, проверка на своей платформе, pull request.
4. **Документация и переводы** — исправьте опечатки, дополните FAQ, добавьте новый файл языка в `src/renderer/locales/` и подключите его в выбор языка.

### Стиль кода

- Чистый JavaScript, без фреймворков в интерфейсе.
- Модули главного процесса по возможности не импортируют Electron (см. `store.js`, `launcher.js`) — так их можно тестировать обычным Node.
- Никаких строк в коде: весь текст интерфейса лежит в `locales/en.js` и `locales/ru.js`.
- Дизайн остаётся строгим чёрно-белым. Без новых акцентных цветов и без эмодзи.
- Отступ 2 пробела, одинарные кавычки, точки с запятой.

### Локальный запуск

```bash
npm install
npm start
```

### Релиз

Мейнтейнеры поднимают версию, обновляют `CHANGELOG.md`, отправляют тег `v*` — GitHub Actions собирает установщики и прикрепляет их к релизу автоматически.
