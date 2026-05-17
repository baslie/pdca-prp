# Инструкции для AI-агента — проект PDCA / ПРП

## Типографика

**Источник правды — [`docs/TYPOGRAPHY.md`](docs/TYPOGRAPHY.md).** Открыть и
прочитать ПЕРЕД любой правкой текста, заголовков, подписей или стилей.

Коротко: 8 ролей текста (`.t-display`, `.t-h-section` (+`--compact`), `.t-h-sub`,
`.t-lead`, `.t-body`, `.t-body-sm`, `.t-quote`, плюс микротексты `.t-eyebrow`,
`.t-meta`, `.t-hint`), 7 цветов (`.t-on-strong/default/muted/soft` для светлого
фона + `.t-on-dark/-muted/-soft` для тёмного), 4 веса (400/500/600/900),
3 значения tracking. Канонический шрифт — Inter (Google Fonts).

**Запрещено:**
- ad-hoc размеры в HTML (`text-[15px]`, `text-[11px]` — кроме одного задокументированного
  плакатного исключения для `.feature-card__label`);
- произвольные opacity на тексте (`text-wire-text/85`, `text-white/70`);
- веса `font-bold` / `font-extrabold`;
- произвольный tracking (`tracking-[-0.025em]`);
- старые имена `.caption-label`, `.h-section`, `.modal-h2` (удалены).

Для проверки прогони grep'ы из раздела «Анти-паттерны» в TYPOGRAPHY.md — все
должны вернуть 0 совпадений (кроме указанного исключения).

## Стэкинг и fixed-слои hero

В hero-секции (первый экран) живут два **fixed**-элемента, которые рисуются
относительно viewport и продолжают «висеть» при скролле вниз:

- `aside#denis-fixed` — фото Дениса справа (`fixed top-0 right-0 h-screen`), `md+` только;
- `img#mountain-fixed` — гора в левом нижнем углу (`md:fixed bottom-0 left-0`).

У обоих **намеренно нет `z-index`** — слои выстраиваются по DOM-order, чтобы
`mix-blend-difference` на героике могла смешиваться с горой и Денисом
(blend работает только внутри одного stacking context — у `body`).

### Правило: всё, что идёт после hero — `relative z-10` + непрозрачный фон

Чтобы fixed-слои не «проступали» сквозь следующие блоки, каждая секция/блок
ниже hero обязан создать собственный stacking context, который их перекроет.
Шаблон такой:

```html
<section class="relative z-10 bg-wire-bg ...">
  ...
</section>
```

Так уже сделаны все основные секции: `#about-training` (`bg-wire-panel`),
`#video` (`bg-black`), `#examples` (`bg-wire-bg`), `#offer-stats`
(фон-картинка + overlay), плюс концевой воздушный `<div>` после offer-stats.

### Чек-лист при добавлении нового блока после hero

1. На корневом элементе блока — `relative z-10`.
2. **Непрозрачный** `bg-*` (не `bg-*/NN`, не прозрачный градиент без подложки).
   Прозрачный/полупрозрачный фон = fixed-Денис и гора снова видны.
3. Если блок — это просто воздух/разделитель, всё равно нужны `z-10` + `bg-*`,
   иначе сквозь него «выстреливают» fixed-слои (этот баг уже ловили).
4. Иконки/декор внутри блока с `position: absolute` относительно self —
   нормально, они в stacking context секции.

### Анти-паттерны

- `<div class="h-12">` без `z-10` и фона после offer-stats / любой секции.
- Снятие `z-10` с секции «для экономии» — fixed-слои сразу проступают.
- Назначение `z-index` Денису/горе — ломает `mix-blend-difference` в hero.

## Деплой

Прод-сайт публикуется на GitHub Pages.

- Репозиторий: `github.com/baslie/pdca-prp`, branch `main`, path `/` (root).
- Публичный URL: `https://roman-purtow.ru/pdca-prp/` (custom-домен, SSL enforced).
- `.nojekyll` в корне отключает Jekyll-обработку — статика отдаётся как есть.
- На время разработки сайт закрыт от индексации: `robots.txt` + `<meta name="robots" content="noindex,...">`. Перед публичным анонсом — снять оба.

### Чек-лист перед публичным анонсом

1. Снять `noindex` из `<meta name="robots">`, `googlebot`, `yandex` (index.html, строки 8-10).
2. В `robots.txt` заменить `Disallow: /` на `Allow: /` (или удалить директиву).
3. Сверить, что `<link rel="canonical">` указывает на актуальный домен (index.html, в SEO-блоке после `<title>`).
4. По возможности — сгенерировать настоящий OG-баннер 1200×630 и заменить `og:image` (см. TODO в head).
5. Опубликовать `sitemap.xml` (опционально — JSON-LD Course уже даёт схему).

## Сборка CSS (Tailwind v4)

Tailwind подключается **локально**, через собранный файл `assets/css/tailwind.css`.
Раньше использовался CDN (`cdn.tailwindcss.com`), но он официально не для прода и
выкидывал warning в DevTools — заменили на полноценную сборку.

### Архитектура

| Файл | Назначение |
|---|---|
| `src/input.css` | Единый исходник: `@import "tailwindcss"`, `@theme` (токены), `@layer base/components` |
| `assets/css/tailwind.css` | Готовый минифицированный output (~45 КБ). **Коммитится в git** — GitHub Pages не запускает сборку |
| `package.json` | npm scripts `build:css` / `watch:css`, devDeps `tailwindcss` + `@tailwindcss/cli` v4 |
| `node_modules/` | Игнорируется git (см. `.gitignore`) |

### Команды

```powershell
# Один раз при клоне репо или после обновления package.json:
npm install

# Прод-сборка (минифицированный output). Запускать перед коммитом, если правил input.css / index.html:
npm run build:css

# Ручной watch-режим (обычно не нужен — встроен в pwsh scripts/dev.ps1):
npm run watch:css
```

### Дизайн-токены — где править

Все цвета `wire-*`, шрифт `font-sans`, кастомные `text-eyebrow/meta/hint`,
`tracking-display/heading/label`, `max-w-prose/prose-narrow` живут в `src/input.css`
внутри блока `@theme { ... }`. Раньше эти токены лежали в `assets/js/tailwind-config.js`
(файл удалён) — теперь источник правды один.

### Антипаттерны

- `theme('colors.wire.X')` в CSS — **v3-синтаксис, удалён в v4**. Используй `var(--color-wire-X)`.
- Возврат CDN `cdn.tailwindcss.com` — нельзя, прод-WARN-инг в DevTools.
- Правка `assets/css/tailwind.css` напрямую — бесполезно, перезатрётся ближайшим `build:css` / `watch:css`. Меняй `src/input.css`.

## Локальный dev-сервер

### Запуск — ТОЛЬКО через единую точку входа

```powershell
pwsh scripts/dev.ps1
```

Скрипт сам:
1. Глушит все висячие процессы `live-server` и `tailwindcss --watch` (даже на других портах) — устраняет накопление сессий между перезапусками.
2. Ждёт освобождения целевого порта (по умолчанию 8765).
3. Если порт занят посторонним процессом — падает с понятным сообщением, **не** пытается запустить параллельный сервер.
4. Стартует Tailwind watcher в фоне (пересобирает `assets/css/tailwind.css` при изменениях `src/input.css` или сканируемых файлов).
5. Поднимает один свежий live-server в foreground.
6. По Ctrl+C — гасит и live-server, и фоновый Tailwind watcher через try/finally.

Альтернативный порт: `pwsh scripts/dev.ps1 -Port 8766`.

### Активный сервер (источник истины)

| Параметр | Значение |
|---|---|
| Инструмент | `live-server` (через `npx --yes`, обёртка — `scripts/dev.ps1`) |
| Порт | **8765** |
| Хост | `127.0.0.1` |
| URL | `http://localhost:8765/index.html` |
| Корень | `C:\Users\Roman\Desktop\pdca-prp` |
| CSS watcher | `tailwindcss --watch` в фоне; `src/input.css` → `assets/css/tailwind.css` |
| Особенность | Авто-перезагрузка страницы при изменении любого файла в проекте |

### Жёсткие правила для AI-агента

1. **Сервер запускает пользователь, не Claude.** При обычной работе Claude вообще не трогает `scripts/dev.ps1` — его инициирует человек, когда хочет визуально проверить вёрстку. Если по задаче нужно убедиться, что сервер уже работает — проверка через:
   ```powershell
   Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue
   ```

2. **Прямые вызовы `npx live-server`, `live-server`, `npm start`, `npx serve` и т. п. запрещены.** Любая необходимость поднять сервер закрывается одним `pwsh scripts/dev.ps1`. Это устраняет накопление висячих процессов: `live-server` при port-busy **не выходит**, а виснет в памяти; единая точка входа сначала глушит, потом запускает.

3. **Никаких альтернатив** — Python `http.server`, `vite`, `serve` и пр. не использовать. Нужен именно `live-server` ради live-reload.

4. **Если порт 8765 нужно изменить** (постоянная коллизия с другим сервисом):
   - Обнови поле «Порт» и «URL» в таблице выше — это единый источник истины.
   - Отдельный коммит `chore: dev-сервер на порту NNNN`.
   - Передай флаг в скрипт: `pwsh scripts/dev.ps1 -Port NNNN`.

### Кэш браузера

Если вкладка была открыта до запуска текущей сессии live-server, в неё мог не попасть watch-скрипт. После первого запуска сервера в новой сессии Claude напомни пользователю обновить вкладку через **Ctrl+F5**.

## Видео BoomStream

На сайте используется видеохостинг **BoomStream** (`play.boomstream.com`). Текущее видео — `nm7YeR0q` (Учебный курс «Профессиональное Решение Проблем», ~30 мин).

### Текущий embed

В `index.html` встроен **прямым `<iframe>`** по официальной рекомендации BoomStream: https://boomstream.ru/documentation/developers/adaptive-style. Без SDK biframesdk.js — адаптивность даёт CSS-контейнер.

```html
<div class="relative w-full aspect-video bg-wire-panel overflow-hidden rounded-sm ...">
  <iframe class="absolute inset-0 w-full h-full"
          src="https://play.boomstream.com/nm7YeR0q?color=false&amp;title=0"
          frameborder="0"
          scrolling="no"
          allow="autoplay; fullscreen"
          loading="lazy"
          title="Учебный курс «Профессиональное Решение Проблем»"></iframe>
</div>
```

Ключевые моменты:
- **`aspect-video` (16:9)** — современный эквивалент CSS-хака `padding-bottom: 56.25%` из документации BoomStream. Резервирует место под плеер до его загрузки, CLS отсутствует.
- **Параметры плеера** (`color=false&title=0`) передаются в query-string `src` — без отдельного `config.jsonp`.
- **`allow="autoplay; fullscreen"`** — обязательно для muted-autoplay (Autoplay Policy браузеров) и для перехода в fullscreen. Поддерживается во всех браузерах с 2020 г.
- **БЕЗ устаревшего `allowfullscreen`** — атрибут-дубликат `allow`'а вызывал DevTools warning «Allow attribute will take precedence over 'allowfullscreen'». Удалён в пользу единственного современного `allow="...fullscreen"`.
- **`loading="lazy"`** — iframe (и связанные ~150 KB JS+медиа) грузятся, когда пользователь доскроллит до видео.
- **Без `biframesdk.js`** и без `config.jsonp` — минус 2 HTTP-запроса и минус JS-зависимость.

### Управление плеером через postMessage API

Документация: https://api.boomstream.com/player-api (англ.), https://boomstream.ru/documentation/api/player-api (рус.).

- **Events от плеера**: `loaded`, `play`, `pause`, `stop`, `time`, `progress`, `fullScreen`, `event`. Ловятся через `window.addEventListener('message', …)`. Origin: `https://play.boomstream.com`. В `event.data` поля: `method`, `code`, `time`, `duration`.
- **Actions в плеер**: `play`, `pause`, `seek`, `mute`, `unmute`, `volume`, `useLastTime`, `previous`, `next`, `fullScreen`, `toggleFullScreenButtonState`. Отправляются через `frame.contentWindow.postMessage({ code: '<CODE>', method: 'action', action: '<ACTION>', data: '' }, 'https://play.boomstream.com')`.
- **iframe должен содержать** `allow="autoplay; fullscreen"` — в текущей разметке прописано вручную (см. блок «Текущий embed» выше).

### Muted-autoplay — как включить

Документация прямо говорит: *«muted required when auto-starting on load»* — автоплей со звуком блокируют сами браузеры (Autoplay Policy), это не ограничение BoomStream. Корректный паттерн — стартовать без звука, пользователь сам включает.

Готовый сниппет (положить inline-скриптом сразу после `<iframe>` BoomStream в `index.html` или в `assets/js/main.js`):

```html
<script>
  (function () {
    var MEDIA_CODE = 'nm7YeR0q';
    var BS_ORIGIN  = 'https://play.boomstream.com';
    var started    = false;

    function sendAction(action, data) {
      var frame = document.querySelector('iframe[src*="' + MEDIA_CODE + '"]');
      if (!frame || !frame.contentWindow) return;
      frame.contentWindow.postMessage(
        { code: MEDIA_CODE, method: 'action', action: action, data: data || '' },
        BS_ORIGIN
      );
    }

    window.addEventListener('message', function (e) {
      if (e.origin !== BS_ORIGIN) return;
      var d = e.data;
      if (!d || d.code !== MEDIA_CODE) return;
      if (d.method === 'loaded' && !started) {
        started = true;
        sendAction('mute');
        sendAction('play');
      }
    }, false);
  })();
</script>
```

Флаг `started` гарантирует одноразовое вмешательство — дальше пользователь сам управляет (unmute, pause, seek и т. д.).

### Edge-cases muted-autoplay

- iOS в режиме Low Power Mode — autoplay блокируется системно, даже muted.
- Firefox — может блокировать по доменной политике пользователя.
- Скрытая вкладка / `prefers-reduced-motion` — не влияет, но autoplay в фоне браузеры приостанавливают.

В этих случаях плеер просто покажет постер с кнопкой play — деградация мягкая.
