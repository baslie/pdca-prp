# PDCA-PRP

Лендинг тренинга «Профессиональное Решение Проблем» Дениса Булгина.

## Стек

Статический сайт без сборки и npm-зависимостей:

- HTML + Tailwind CSS через **CDN** (`cdn.tailwindcss.com`) с inline-конфигом
  темы и `@apply`-компонентами внутри `<style type="text/tailwindcss">` в
  `index.html`.
- Ванильный JS, разнесён по модулям (`main.js`, `modal.js`, `examples.js`).
- Иконки — Lucide (CDN), шрифт — Inter (Google Fonts).
- Видеохостинг — BoomStream (прямой `<iframe>` без SDK).
- Хостинг — GitHub Pages, ветка `main`, root.

`package.json` и `node_modules/` намеренно отсутствуют — сайт открывается
двойным кликом по `index.html`. `npx live-server` нужен только для
live-reload в процессе разработки.

## Структура

```
.
├── index.html                ← разметка + inline Tailwind (@layer base/components)
├── robots.txt                ← запрет индексации (сайт в разработке)
├── .nojekyll                 ← отключает Jekyll-обработку на GitHub Pages
├── CLAUDE.md                 ← инструкции для AI-агента (и людей-разработчиков)
├── README.md                 ← этот файл
├── assets/
│   ├── js/
│   │   ├── tailwind-config.js    конфиг темы Tailwind (цвета, fontSize, tracking)
│   │   ├── main.js               общая инициализация, Lucide-иконки
│   │   ├── modal.js              общий хелпер модалок (PDCAModal)
│   │   └── examples.js           логика секции «Примеры решения проблем»
│   ├── images/                   фото Дениса, гора, облака
│   └── svg/                      логотип, иконки PDF
├── scripts/
│   ├── dev.ps1                   ЕДИНАЯ точка входа для dev-сервера
│   └── typography.py             вспомогательные скрипты по тексту
└── docs/
    ├── TYPOGRAPHY.md             источник правды по тексту (см. ниже)
    └── …                         брифы, PDF, видео, схемы (не для прода)
```

## Локальный dev-сервер

Запускать **только** через единую точку входа:

```powershell
pwsh scripts/dev.ps1
```

Скрипт сам глушит висячие `live-server`-процессы, ждёт освобождения порта и
поднимает один свежий сервер на `http://localhost:8765/index.html` с
авто-перезагрузкой страницы при изменении файлов.

Альтернативный порт: `pwsh scripts/dev.ps1 -Port 8766`.

Прямые вызовы `npx live-server`, `npm start`, `npx serve`, Python `http.server`
и прочее — **запрещены**. `live-server` при занятом порте не выходит, а
накапливает висячие процессы; единая точка входа сначала глушит, потом
запускает. Подробности — в `CLAUDE.md`.

## Типографика

Весь текст на странице подчинён единой системе: **8 ролей** (`.t-display`,
`.t-h-section` +`--compact`, `.t-h-sub`, `.t-lead`, `.t-body`, `.t-body-sm`,
`.t-quote`, плюс микротексты `.t-eyebrow`/`.t-meta`/`.t-hint`),
**7 цветов** (`.t-on-strong/default/muted/soft` для светлого фона,
`.t-on-dark/-muted/-soft` для тёмного), **4 веса** (400/500/600/900).

Единственный источник правды — [`docs/TYPOGRAPHY.md`](docs/TYPOGRAPHY.md).
Открыть и прочитать **перед** любой правкой текста, заголовков, подписей
или стилей. Там же — список анти-паттернов и grep-проверка перед коммитом.

## Деплой

Сайт публикуется на GitHub Pages:

- Репозиторий: `github.com/baslie/pdca-prp`, branch `main`, path `/` (root).
- Публичный URL: `https://roman-purtow.ru/pdca-prp/` (custom-домен, HTTPS).
- `.nojekyll` в корне отключает Jekyll-обработку — статика отдаётся как есть.

После `git push origin main` GitHub Pages выкатывает изменения за ~1–2 минуты.

## Индексация

На время разработки сайт закрыт от индексации:

- `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">`
  в `<head>` (плюс отдельные `googlebot` и `yandex` теги).
- `robots.txt` с `Disallow: /` для всех ботов.

Перед публичным анонсом обе меры нужно снять.

## Соглашения для контрибьютора

- Перед правкой текста — открыть `docs/TYPOGRAPHY.md`.
- Перед добавлением блока после hero — прочитать раздел «Стэкинг и fixed-слои
  hero» в `CLAUDE.md` (нужны `relative z-10` + непрозрачный фон, иначе
  fixed-слои героики проступают сквозь блок).
- Коммиты — в стиле уже имеющихся в репозитории (`git log -5 --oneline`):
  префикс типа (`feat:`/`fix:`/`style:`/`refactor:`/`docs:`/`chore:`), затем
  область в скобках, затем суть на русском.
- Не использовать `--no-verify`, `--amend`, `git reset --hard`, force-push без
  явной необходимости.
